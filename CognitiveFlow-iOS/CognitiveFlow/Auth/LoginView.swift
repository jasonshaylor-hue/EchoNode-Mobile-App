// CognitiveFlow-iOS/CognitiveFlow/Auth/LoginView.swift
import AuthenticationServices
import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) private var appState
    @State private var authError: String?
    @State private var nonce = ""

    var body: some View {
        VStack(spacing: 40) {
            Spacer()

            // App icon + branding
            VStack(spacing: 12) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 64))
                    .foregroundStyle(.tint)

                Text("Cognitive Flow")
                    .font(.largeTitle.bold())

                Text("Voice-first ADHD productivity")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Sign In with Apple button
            SignInWithAppleButton(.signIn) { request in
                nonce = AuthService.shared.prepareNonce()
                request.requestedScopes = [.fullName, .email]
                request.nonce = nonce
            } onCompletion: { result in
                Task {
                    do {
                        try await AuthService.shared.handleAuthorization(result)
                    } catch {
                        authError = "Sign in failed. Please try again."
                    }
                }
            }
            .signInWithAppleButtonStyle(.whiteOutline)
            .frame(height: 50)
            .padding(.horizontal, 32)
            .accessibilityLabel("Sign in with Apple")

            // Error feedback
            if let error = authError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Spacer()
        }
        .background(Color(.systemBackground))
    }
}
