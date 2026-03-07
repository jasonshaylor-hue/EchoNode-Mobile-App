// CognitiveFlow-iOS/CognitiveFlow/Services/TaskService.swift
import Foundation
import Supabase

final class TaskService {
    static let shared = TaskService()
    private let client = SupabaseService.shared.client

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    func fetchOpenTasks() async throws -> [AppTask] {
        return try await client.database
            .from("tasks")
            .select()
            .eq("status", value: "open")
            .order("mention_count", ascending: false)
            .execute()
            .value
    }

    func fetchCompletedTasks() async throws -> [AppTask] {
        return try await client.database
            .from("tasks")
            .select()
            .eq("status", value: "done")
            .order("completed_at", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    func completeTask(id: UUID) async throws {
        let now = ISO8601DateFormatter().string(from: Date())
        try await client.database
            .from("tasks")
            .update(["status": "done", "completed_at": now])
            .eq("id", value: id.uuidString)
            .execute()
    }

    func deleteTask(id: UUID) async throws {
        try await client.database
            .from("tasks")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
}
