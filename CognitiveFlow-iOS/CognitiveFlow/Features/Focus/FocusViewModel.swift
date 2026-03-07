// CognitiveFlow-iOS/CognitiveFlow/Features/Focus/FocusViewModel.swift
import Observation
import Foundation

@Observable
@MainActor
final class FocusViewModel {
    var focusTasks: [AppTask] = []
    var openTasks: [AppTask] = []
    var completedTasks: [AppTask] = []
    var completedLoaded = false
    var isLoadingNext = false
    var isLoadingCompleted = false
    var nextTaskResult: NextTaskResult?

    // All open tasks grouped by priority, excluding today's focus
    var groupedRemainingTasks: [String: [AppTask]] {
        let focusIds = Set(focusTasks.map(\.id))
        let remaining = openTasks.filter { !focusIds.contains($0.id) }
        return Dictionary(grouping: remaining) { $0.priority.rawValue }
    }

    private let taskService = TaskService.shared
    private let edgeFunctions = EdgeFunctionService.shared

    func loadInitialData() async {
        async let focus = edgeFunctions.fetchDailyFocus()
        async let open = taskService.fetchOpenTasks()

        do {
            focusTasks = try await focus
            openTasks = try await open
        } catch {
            // Fallback: use open tasks for focus if edge function fails
            openTasks = (try? await taskService.fetchOpenTasks()) ?? []
            focusTasks = Array(openTasks.prefix(3))
        }
    }

    func loadCompletedTasks() async {
        guard !completedLoaded else { return }
        isLoadingCompleted = true
        defer { isLoadingCompleted = false }
        completedTasks = (try? await taskService.fetchCompletedTasks()) ?? []
        completedLoaded = true
    }

    func fetchNextTask() async {
        isLoadingNext = true
        defer { isLoadingNext = false }
        nextTaskResult = try? await edgeFunctions.fetchNextTask()
    }

    func completeTask(id: UUID) async {
        // Optimistic update
        openTasks.removeAll { $0.id == id }
        focusTasks.removeAll { $0.id == id }
        nextTaskResult = nil

        try? await taskService.completeTask(id: id)
    }

    func deleteTask(id: UUID) async {
        // Optimistic update
        openTasks.removeAll { $0.id == id }
        focusTasks.removeAll { $0.id == id }

        try? await taskService.deleteTask(id: id)
    }
}
