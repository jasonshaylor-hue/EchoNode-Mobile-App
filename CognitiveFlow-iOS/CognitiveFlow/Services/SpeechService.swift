// CognitiveFlow-iOS/CognitiveFlow/Services/SpeechService.swift
import AVFoundation
import Observation
import Speech

@Observable
@MainActor
final class SpeechService: NSObject {
    var isListening = false
    var transcribedText = ""
    var errorMessage: String?
    var isAvailable = false

    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    override init() {
        super.init()
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        recognizer?.delegate = self
        requestSpeechAuthorization()
    }

    private func requestSpeechAuthorization() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    self?.isAvailable = true
                case .denied, .restricted:
                    self?.isAvailable = false
                    self?.errorMessage = "Speech recognition access denied — type instead"
                case .notDetermined:
                    self?.isAvailable = false
                @unknown default:
                    self?.isAvailable = false
                }
            }
        }
    }

    func startListening() {
        guard isAvailable, !isListening else { return }
        errorMessage = nil
        transcribedText = ""

        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            errorMessage = "Microphone access failed — type instead"
            return
        }

        request = SFSpeechAudioBufferRecognitionRequest()
        guard let request else { return }
        request.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }

        do {
            try audioEngine.start()
        } catch {
            errorMessage = "Speech capture failed — type instead"
            cleanupAudio()
            return
        }

        isListening = true

        recognitionTask = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            DispatchQueue.main.async {
                if let result {
                    self.transcribedText = result.bestTranscription.formattedString
                }
                if let error {
                    self.stopListening()
                    let nsError = error as NSError
                    // Code 1110 = no speech detected
                    if nsError.code == 1110 {
                        self.errorMessage = "No speech detected — try again"
                    } else if nsError.code != 301 {  // 301 = cancelled normally
                        self.errorMessage = "Speech capture failed — type instead"
                    }
                }
                if result?.isFinal == true { self.stopListening() }
            }
        }
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        recognitionTask?.cancel()
        request = nil
        recognitionTask = nil
        isListening = false
        try? AVAudioSession.sharedInstance().setActive(false)
    }

    private func cleanupAudio() {
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        request = nil
        recognitionTask = nil
        isListening = false
    }
}

extension SpeechService: SFSpeechRecognizerDelegate {
    nonisolated func speechRecognizer(_ recognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        DispatchQueue.main.async { self.isAvailable = available }
    }
}
