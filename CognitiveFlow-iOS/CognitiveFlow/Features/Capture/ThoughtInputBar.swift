// CognitiveFlow-iOS/CognitiveFlow/Features/Capture/ThoughtInputBar.swift
import SwiftUI

struct ThoughtInputBar: View {
    let onCapture: (String) -> Void
    let isProcessing: Bool

    @State private var textInput = ""
    @State private var speechService = SpeechService()

    private var canSubmit: Bool {
        !textInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isProcessing
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .bottom, spacing: 8) {
                // Text input area — maps web <textarea>
                TextField(
                    "What's on your mind?",
                    text: speechService.isListening ? .constant(speechService.transcribedText.isEmpty ? "Listening…" : speechService.transcribedText) : $textInput,
                    axis: .vertical
                )
                .lineLimit(3...6)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color(.separator), lineWidth: 1)
                )
                .disabled(isProcessing || speechService.isListening)
                .onChange(of: speechService.transcribedText) { _, new in
                    if !new.isEmpty { textInput = new }
                }
                .onChange(of: speechService.isListening) { _, listening in
                    if !listening && !speechService.transcribedText.isEmpty {
                        textInput = speechService.transcribedText
                    }
                }

                // Mic button — maps to animated mic button in web
                if speechService.isAvailable {
                    Button {
                        if speechService.isListening {
                            speechService.stopListening()
                        } else {
                            speechService.startListening()
                        }
                    } label: {
                        Image(systemName: speechService.isListening ? "mic.fill" : "mic")
                            .font(.title2)
                            .foregroundStyle(.white)
                            .frame(width: 48, height: 48)
                            .background(Color.accentColor)
                            .clipShape(Circle())
                            .symbolEffect(.pulse, isActive: speechService.isListening)
                    }
                    .disabled(isProcessing)
                    .accessibilityLabel(speechService.isListening ? "Stop listening" : "Start voice capture")
                    .accessibilityHint("Double tap to toggle voice input")
                }
            }

            // Speech error label — maps web <p role="alert"> error
            if let error = speechService.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .accessibilityAddTraits(.isStaticText)
                    .accessibilityLabel("Speech error: \(error)")
            }

            // Submit button — maps web "Capture Thought" button
            Button {
                let trimmed = textInput.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty else { return }
                onCapture(trimmed)
                textInput = ""
                speechService.transcribedText = ""
            } label: {
                Group {
                    if isProcessing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Capture Thought")
                            .fontWeight(.medium)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 48)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canSubmit)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }
}
