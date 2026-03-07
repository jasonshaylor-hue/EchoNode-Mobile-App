// CognitiveFlow-iOS/CognitiveFlow/App/AppState.swift
import Observation
import Supabase

@Observable
@MainActor
final class AppState {
    var isAuthenticated = false
    var userId: UUID?
    var userEmail: String?

    init() {
        Task {
            // Restore session from Keychain on launch
            if let session = try? await SupabaseService.shared.client.auth.session {
                isAuthenticated = true
                userId = UUID(uuidString: session.user.id.uuidString)
                userEmail = session.user.email
            }

            // Subscribe to auth state changes (sign in / sign out)
            for await (event, session) in SupabaseService.shared.client.auth.authStateChanges {
                switch event {
                case .signedIn:
                    isAuthenticated = true
                    userId = UUID(uuidString: session?.user.id.uuidString ?? "")
                    userEmail = session?.user.email
                case .signedOut:
                    isAuthenticated = false
                    userId = nil
                    userEmail = nil
                default:
                    break
                }
            }
        }
    }

    func signOut() async {
        try? await SupabaseService.shared.client.auth.signOut()
    }
}
