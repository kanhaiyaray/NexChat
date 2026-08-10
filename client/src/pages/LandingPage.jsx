import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="landing-page">
      <div className="landing-shell">
        <header className="landing-header">
          <div className="brand-wrap">
            <div className="brand-mark">N</div>
            <span>NexChat</span>
          </div>

          <nav className="landing-nav">
            <Link to="/sign-in">Sign in</Link>
            <Link to="/sign-up" className="nav-button">Sign up</Link>
          </nav>
        </header>

        <main className="landing-main">
          <section className="hero-copy">
            <p className="eyebrow">Private rooms</p>
            <h1>Chat in rooms that feel instant and secure.</h1>
            <p className="hero-text">
              Start conversations with your team, friends, or private circles using a clean,
              simple space with Google-powered sign-in and room access.
            </p>

            <SignedOut>
              <div className="cta-row">
                <Link to="/sign-in" className="primary-button">Continue with Google</Link>
                <Link to="/sign-up" className="secondary-button">Create account</Link>
              </div>
              <div className="helper-row">
                <Link to="/sign-in">Already have an account?</Link>
                <Link to="/sign-up">Need a new account?</Link>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="welcome-box">
                <div className="welcome-text">
                  <span className="welcome-label">Welcome back</span>
                  <strong>{user?.firstName || user?.fullName || 'Friend'}</strong>
                </div>
                <div className="welcome-actions">
                  <UserButton afterSignOutUrl="/" />
                  <Link to="/chat" className="primary-button small-button">Open NexChat</Link>
                </div>
              </div>
            </SignedIn>
          </section>

          <aside className="hero-panel" aria-label="NexChat preview">
            <div className="panel-header">
              <span className="status-dot" />
              <span>live room</span>
            </div>

            <div className="room-card">
              <div className="room-badge">Public</div>
              <h2>Design Team</h2>
              <div className="member-list">
                <span>Alina</span>
                <span>Ken</span>
                <span>Rae</span>
                <span>+8</span>
              </div>
            </div>

            <div className="message-stack">
              <div className="message message-left">
                <span className="avatar">A</span>
                <div>
                  <strong>Alina</strong>
                  <p>New mockups are ready.</p>
                </div>
              </div>

              <div className="message message-right">
                <div>
                  <strong>You</strong>
                  <p>Perfect. I’ll review them now.</p>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
