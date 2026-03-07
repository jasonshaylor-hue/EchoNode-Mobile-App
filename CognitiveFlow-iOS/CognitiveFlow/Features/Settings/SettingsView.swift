// CognitiveFlow-iOS/CognitiveFlow/Features/Settings/SettingsView.swift
import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @AppStorage("cf_preferred_theme") private var preferredTheme = "system"
    @State private var showSignOutConfirmation = false

    var body: some View {
        NavigationStack {
            Form {
                // Appearance — maps web Appearance section
                Section("Appearance") {
                    Picker("Theme", selection: $preferredTheme) {
                        Text("System").tag("system")
                        Text("Dark").tag("dark")
                        Text("Light").tag("light")
                    }
                    .pickerStyle(.segmented)
                }

                // Account — new for iOS
                Section("Account") {
                    if let email = appState.userEmail {
                        LabeledContent("Signed in as", value: email)
                    }
                    Button("Sign Out", role: .destructive) {
                        showSignOutConfirmation = true
                    }
                }

                // About
                Section("About") {
                    LabeledContent("App", value: "Cognitive Flow")
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                }
            }
            .navigationTitle("Settings")
        }
        .preferredColorScheme(
            preferredTheme == "dark" ? .dark :
            preferredTheme == "light" ? .light : nil
        )
        .confirmationDialog("Sign Out", isPresented: $showSignOutConfirmation) {
            Button("Sign Out", role: .destructive) {
                Task { await appState.signOut() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("You will need to sign in again to access your tasks.")
        }
    }
}
