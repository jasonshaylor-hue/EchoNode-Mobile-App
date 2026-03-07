// CognitiveFlow-iOS/CognitiveFlowWatch/WatchRootView.swift
import SwiftUI

struct WatchRootView: View {
    @Environment(WatchSessionManager.self) private var session

    var body: some View {
        if session.accessToken != nil {
            TabView {
                WatchCaptureView()
                WatchFocusView()
            }
            .tabViewStyle(.page)
        } else {
            VStack {
                Image(systemName: "iphone")
                    .font(.title)
                Text("Open Cognitive Flow\non iPhone to continue")
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            .onAppear { session.requestToken() }
        }
    }
}
