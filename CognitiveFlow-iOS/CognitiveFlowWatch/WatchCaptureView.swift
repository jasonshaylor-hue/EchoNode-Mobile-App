// CognitiveFlow-iOS/CognitiveFlowWatch/WatchCaptureView.swift
import SwiftUI

struct WatchCaptureView: View {
    @Environment(WatchSessionManager.self) private var session
    @State private var dictatedText = ""
    @State private var isProcessing = false
    @State private var statusMessage = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "mic.badge.plus")
                    .font(.title2)
                    .foregroundStyle(.blue)

                Text(dictatedText.isEmpty ? "Tap to capture a thought" : dictatedText)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(dictatedText.isEmpty ? .secondary : .primary)
                    .lineLimit(4)

                if !statusMessage.isEmpty {
                    Text(statusMessage)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                // Dictation button
                Button {
                    presentTextInput()
                } label: {
                    Label("Dictate", systemImage: "mic")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isProcessing || session.accessToken == nil)

                // Submit button
                if !dictatedText.isEmpty {
                    Button {
                        Task { await submitThought() }
                    } label: {
                        Label(isProcessing ? "Processing…" : "Capture", systemImage: "checkmark")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isProcessing)
                }
            }
            .padding()
        }
        .navigationTitle("Capture")
    }

    private func presentTextInput() {
        // watchOS dictation via WKExtension presentTextInputController
        WKExtension.shared().visibleInterfaceController?.presentTextInputController(
            withSuggestions: nil,
            allowedInputMode: .plain
        ) { results in
            if let text = results?.first as? String {
                dictatedText = text
            }
        }
    }

    private func submitThought() async {
        guard let token = session.accessToken, !dictatedText.isEmpty else { return }
        isProcessing = true
        statusMessage = ""
        defer { isProcessing = false }

        guard let url = URL(string: "\(supabaseURL)/functions/v1/process-thought") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["rawText": dictatedText])

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            let http = response as? HTTPURLResponse
            if http?.statusCode == 200 {
                statusMessage = "Captured!"
                dictatedText = ""
            } else {
                statusMessage = "Failed — try again"
            }
        } catch {
            statusMessage = "Network error"
        }
    }

    private var supabaseURL: String {
        Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? ""
    }
}
