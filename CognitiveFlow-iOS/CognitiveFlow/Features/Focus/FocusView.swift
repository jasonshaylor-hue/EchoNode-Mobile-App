// CognitiveFlow-iOS/CognitiveFlow/Features/Focus/FocusView.swift
import SwiftUI

enum FocusTab: String, CaseIterable {
    case active = "Active"
    case completed = "Completed"
}

struct FocusView: View {
    @State private var viewModel = FocusViewModel()
    @State private var selectedTab: FocusTab = .active

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segmented picker — maps web tab toggle
                Picker("View", selection: $selectedTab) {
                    ForEach(FocusTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .onChange(of: selectedTab) { _, tab in
                    if tab == .completed { Task { await viewModel.loadCompletedTasks() } }
                }

                if selectedTab == .active {
                    activeContent
                } else {
                    completedContent
                }
            }
            .navigationTitle("Focus")
            .task { await viewModel.loadInitialData() }
        }
    }

    @ViewBuilder
    private var activeContent: some View {
        List {
            // Today's Focus section
            if !viewModel.focusTasks.isEmpty {
                Section("Today's Focus") {
                    ForEach(viewModel.focusTasks) { task in
                        SwipeableTaskCard(
                            task: task,
                            onComplete: { await viewModel.completeTask(id: task.id) },
                            onDelete: { await viewModel.deleteTask(id: task.id) }
                        )
                    }
                }
            }

            // "What do I do next?" button + result
            Section {
                Button {
                    Task { await viewModel.fetchNextTask() }
                } label: {
                    HStack {
                        Spacer()
                        Label(
                            viewModel.isLoadingNext ? "Thinking…" : "What do I do next?",
                            systemImage: "sparkles"
                        )
                        .fontWeight(.medium)
                        Spacer()
                    }
                    .frame(height: 48)
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isLoadingNext)
                .listRowBackground(Color.clear)
                .listRowInsets(.init())

                if let result = viewModel.nextTaskResult {
                    NextTaskBannerView(
                        result: result,
                        onComplete: {
                            if let id = result.task?.id { await viewModel.completeTask(id: id) }
                        },
                        onDelete: {
                            if let id = result.task?.id { await viewModel.deleteTask(id: id) }
                        }
                    )
                }
            }

            // All open tasks grouped by priority
            let priorities = ["high", "medium", "low"]
            ForEach(priorities, id: \.self) { key in
                if let tasks = viewModel.groupedRemainingTasks[key], !tasks.isEmpty {
                    Section(key.uppercased()) {
                        ForEach(tasks) { task in
                            SwipeableTaskCard(
                                task: task,
                                onComplete: { await viewModel.completeTask(id: task.id) },
                                onDelete: { await viewModel.deleteTask(id: task.id) }
                            )
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .animation(.easeInOut(duration: 0.2), value: viewModel.openTasks.count)
    }

    @ViewBuilder
    private var completedContent: some View {
        if viewModel.isLoadingCompleted {
            ProgressView().frame(maxHeight: .infinity)
        } else if viewModel.completedTasks.isEmpty {
            ContentUnavailableView(
                "No completed tasks yet",
                systemImage: "checkmark.circle",
                description: Text("Complete a task to see it here")
            )
        } else {
            List(viewModel.completedTasks) { task in
                TaskCardView(task: task, isCompleted: true, onComplete: { _ in })
            }
            .listStyle(.plain)
        }
    }
}
