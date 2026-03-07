// CognitiveFlow-iOS/CognitiveFlow/Features/Capture/CaptureView.swift
import SwiftUI

struct CaptureView: View {
    @State private var viewModel = CaptureViewModel()
    @State private var searchText = ""

    private var filteredThoughts: [CapturedThought] {
        guard !searchText.isEmpty else { return viewModel.thoughts }
        return viewModel.thoughts.filter {
            $0.cleanedText.localizedCaseInsensitiveContains(searchText) ||
            $0.rawText.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Thought list with native search
                List {
                    ForEach(filteredThoughts) { thought in
                        ThoughtCardView(thought: thought)
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                            .listRowInsets(.init(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search thoughts…")
                .overlay {
                    if filteredThoughts.isEmpty && !viewModel.isProcessing {
                        ContentUnavailableView(
                            searchText.isEmpty ? "No thoughts yet" : "No results",
                            systemImage: searchText.isEmpty ? "tray" : "magnifyingglass",
                            description: Text(searchText.isEmpty
                                ? "Capture a thought to get started"
                                : "No thoughts match '\(searchText)'"
                            )
                        )
                    }
                }
                .animation(.easeInOut(duration: 0.2), value: viewModel.thoughts.count)

                // Error banner
                if let error = viewModel.errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                        Text(error)
                            .font(.caption)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.8))
                }

                // Input bar fixed at bottom (thumb zone)
                ThoughtInputBar(
                    onCapture: { rawText in
                        Task { await viewModel.handleCapture(rawText: rawText) }
                    },
                    isProcessing: viewModel.isProcessing
                )
            }
            .navigationTitle("Cognitive Flow")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task { await viewModel.loadThoughts() }
    }
}
