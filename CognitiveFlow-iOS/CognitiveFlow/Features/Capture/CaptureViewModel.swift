// CognitiveFlow-iOS/CognitiveFlow/Features/Capture/CaptureViewModel.swift
import Observation

@Observable
@MainActor
final class CaptureViewModel {
    var thoughts: [CapturedThought] = []
    var isProcessing = false
    var errorMessage: String?

    private let edgeFunctions = EdgeFunctionService.shared
    private let supabase = SupabaseService.shared

    func loadThoughts() async {
        do {
            thoughts = try await supabase.fetchThoughts()
        } catch {
            errorMessage = "Could not load thoughts."
        }
    }

    func handleCapture(rawText: String) async {
        guard !rawText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isProcessing = true
        errorMessage = nil
        defer { isProcessing = false }

        do {
            let thought = try await edgeFunctions.processThought(rawText: rawText)
            thoughts.insert(thought, at: 0)
        } catch {
            errorMessage = "Processing failed. Please try again."
        }
    }
}
