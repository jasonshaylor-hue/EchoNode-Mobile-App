// CognitiveFlow-iOS/CognitiveFlow/App/RootView.swift
import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        if appState.isAuthenticated {
            ContentView()
        } else {
            LoginView()
        }
    }
}
