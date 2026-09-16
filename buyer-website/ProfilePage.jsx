import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Settings,
  LogOut,
  Home,
  ShieldCheck,
  Pencil,
  ChevronRight,
} from "lucide-react";

export default function ProfilePage({ onBack }) {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="profile-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Manrope:wght@400;500;600;700;800&display=swap');

        .profile-page {
          --ink: #191724;
          --indigo: #45206B;
          --amber: #FFB400;
          --amber-lt: #FFF3D6;
          --emerald: #00A884;
          --blue: #3867FF;
          --stone: #F7F7F9;
          --white: #FFFFFF;
          --text: #4a4458;
          --muted: #7b7489;
          --line: #e7e5ec;

          --serif: 'DM Serif Display', Georgia, serif;
          --sans: Manrope, system-ui, sans-serif;

          min-height: 100vh;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(69,32,107,.08),
              transparent 28%
            ),
            #F7F7F9;
          color: var(--text);
          font-family: var(--sans);
          padding-bottom: 70px;
        }

        .profile-page * {
          box-sizing: border-box;
        }

        .profile-container {
          width: min(1120px, calc(100% - 40px));
          margin: 0 auto;
        }

        /* TOP BAR */

        .profile-topbar {
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 0;
          background: transparent;
          color: var(--ink);
          font-weight: 800;
          cursor: pointer;
          padding: 9px 0;
          transition: .25s ease;
        }

        .back-button:hover {
          color: var(--indigo);
          transform: translateX(-4px);
        }

        .profile-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--serif);
          font-size: 1.4rem;
          color: var(--ink);
        }

        .profile-brand-mark {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(135deg, #45206B, #3867FF);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* HERO PROFILE */

        .profile-hero {
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          min-height: 310px;
          background:
            radial-gradient(
              circle at 85% 20%,
              rgba(255,180,0,.2),
              transparent 22%
            ),
            linear-gradient(
              120deg,
              #191724 0%,
              #45206B 52%,
              #3867FF 100%
            );
          color: white;
          padding: 48px;
          display: flex;
          align-items: center;
          box-shadow: 0 25px 65px rgba(25,23,36,.18);
        }

        .profile-hero::before {
          content: "";
          position: absolute;
          width: 330px;
          height: 330px;
          right: -100px;
          bottom: -170px;
          border: 70px solid rgba(255,255,255,.07);
          border-radius: 50%;
        }

        .profile-hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .avatar {
          width: 145px;
          height: 145px;
          border-radius: 50%;
          flex-shrink: 0;
          border: 5px solid rgba(255,255,255,.8);
          background:
            linear-gradient(
              145deg,
              #FFF3D6,
              #FFB400
            );
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--indigo);
          box-shadow: 0 18px 35px rgba(0,0,0,.2);
        }

        .profile-copy small {
          display: inline-block;
          color: #FFB400;
          font-size: .72rem;
          letter-spacing: .14em;
          font-weight: 800;
          margin-bottom: 9px;
        }

        .profile-copy h1 {
          font-family: var(--serif);
          font-weight: 400;
          font-size: 3.2rem;
          line-height: 1;
          margin: 0 0 9px;
        }

        .profile-copy p {
          margin: 0;
          color: rgba(255,255,255,.75);
          font-size: .92rem;
        }

        .edit-profile {
          position: absolute;
          right: 32px;
          top: 32px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 999px;
          padding: 10px 15px;
          color: white;
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(8px);
          cursor: pointer;
          font-size: .8rem;
          font-weight: 800;
          transition: .25s ease;
        }

        .edit-profile:hover {
          background: rgba(255,255,255,.2);
          transform: translateY(-2px);
        }

        /* TABS */

        .profile-tabs {
          display: flex;
          gap: 7px;
          margin: 30px 0;
          padding: 5px;
          width: fit-content;
          background: white;
          border: 1px solid var(--line);
          border-radius: 999px;
        }

        .profile-tab {
          border: 0;
          background: transparent;
          color: var(--muted);
          border-radius: 999px;
          padding: 10px 18px;
          cursor: pointer;
          font-size: .82rem;
          font-weight: 800;
          transition: .25s ease;
        }

        .profile-tab.active {
          background: var(--ink);
          color: white;
        }

        /* GRID */

        .profile-grid {
          display: grid;
          grid-template-columns: 1.35fr .65fr;
          gap: 24px;
        }

        .profile-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 27px;
          box-shadow: 0 12px 35px rgba(25,23,36,.04);
        }

        .profile-card h2 {
          font-family: var(--serif);
          font-size: 1.55rem;
          font-weight: 400;
          color: var(--ink);
          margin: 0 0 22px;
        }

        .details-list {
          display: grid;
          gap: 3px;
        }

        .detail-row {
          min-height: 66px;
          display: flex;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid var(--line);
        }

        .detail-row:last-child {
          border-bottom: 0;
        }

        .detail-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--stone);
          color: var(--indigo);
          flex-shrink: 0;
        }

        .detail-text small {
          display: block;
          color: var(--muted);
          font-size: .72rem;
          margin-bottom: 3px;
        }

        .detail-text strong {
          color: var(--ink);
          font-size: .87rem;
        }

        /* SIDE MENU */

        .menu-card {
          padding: 12px;
        }

        .menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 0;
          background: transparent;
          padding: 15px 13px;
          border-radius: 14px;
          color: var(--text);
          cursor: pointer;
          text-align: left;
          transition: .25s ease;
        }

        .menu-item:hover {
          background: var(--stone);
          color: var(--indigo);
          transform: translateX(3px);
        }

        .menu-item-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: var(--stone);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--indigo);
        }

        .menu-item-content {
          flex: 1;
        }

        .menu-item-content strong {
          display: block;
          font-size: .84rem;
          color: var(--ink);
        }

        .menu-item-content small {
          color: var(--muted);
          font-size: .7rem;
        }

        .logout {
          color: #d34b52;
          margin-top: 6px;
        }

        .logout .menu-item-icon {
          color: #d34b52;
        }

        /* VERIFICATION */

        .verification {
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border-radius: 18px;
          background: var(--amber-lt);
        }

        .verification-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: var(--emerald);
          flex-shrink: 0;
        }

        .verification strong {
          display: block;
          color: var(--ink);
          font-size: .85rem;
          margin-bottom: 3px;
        }

        .verification span {
          color: var(--muted);
          font-size: .72rem;
        }

        @media (max-width: 800px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }

          .profile-hero {
            padding: 35px 25px;
          }

          .profile-hero-content {
            align-items: flex-start;
            flex-direction: column;
          }

          .profile-copy h1 {
            font-size: 2.6rem;
          }

          .edit-profile {
            right: 20px;
            top: 20px;
          }
        }

        @media (max-width: 520px) {
          .profile-container {
            width: min(100% - 28px, 1120px);
          }

          .profile-tabs {
            width: 100%;
            overflow-x: auto;
          }

          .profile-tab {
            white-space: nowrap;
          }

          .avatar {
            width: 110px;
            height: 110px;
          }

          .profile-copy h1 {
            font-size: 2.25rem;
          }
        }
      `}</style>

      <div className="profile-container">
        <header className="profile-topbar">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={18} />
            Back to Landlogy
          </button>

          <div className="profile-brand">
            <span className="profile-brand-mark">
              <Home size={15} />
            </span>
            Landlogy
          </div>
        </header>

        <section className="profile-hero">
          <button className="edit-profile">
            <Pencil size={14} />
            Edit profile
          </button>

          <div className="profile-hero-content">
            <div className="avatar">
              <User size={62} strokeWidth={1.4} />
            </div>

            <div className="profile-copy">
              <small>LANDLOGY MEMBER</small>
              <h1>Welcome back.</h1>
              <p>
                Your property journey, all in one place.
              </p>
            </div>
          </div>
        </section>

        <nav className="profile-tabs">
          {["Overview", "Saved Properties", "My Searches"].map(
            (tab) => (
              <button
                key={tab}
                className={
                  activeTab === tab
                    ? "profile-tab active"
                    : "profile-tab"
                }
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            )
          )}
        </nav>

        <div className="profile-grid">
          <section className="profile-card">
            <h2>Personal information</h2>

            <div className="details-list">
              <div className="detail-row">
                <div className="detail-icon">
                  <User size={18} />
                </div>

                <div className="detail-text">
                  <small>FULL NAME</small>
                  <strong>Landlogy Member</strong>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon">
                  <Mail size={18} />
                </div>

                <div className="detail-text">
                  <small>EMAIL ADDRESS</small>
                  <strong>member@landlogy.com</strong>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon">
                  <Phone size={18} />
                </div>

                <div className="detail-text">
                  <small>PHONE NUMBER</small>
                  <strong>+91 XXXXX XXXXX</strong>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon">
                  <MapPin size={18} />
                </div>

                <div className="detail-text">
                  <small>PREFERRED LOCATION</small>
                  <strong>India</strong>
                </div>
              </div>
            </div>

            <div className="verification">
              <div className="verification-icon">
                <ShieldCheck size={21} />
              </div>

              <div>
                <strong>Account protected</strong>
                <span>
                  Your Landogy profile is secured and verified.
                </span>
              </div>
            </div>
          </section>

          <aside className="profile-card menu-card">
            <button className="menu-item">
              <div className="menu-item-icon">
                <Heart size={18} />
              </div>

              <div className="menu-item-content">
                <strong>Saved properties</strong>
                <small>View your favourites</small>
              </div>

              <ChevronRight size={16} />
            </button>

            <button className="menu-item">
              <div className="menu-item-icon">
                <Home size={18} />
              </div>

              <div className="menu-item-content">
                <strong>My enquiries</strong>
                <small>Track property enquiries</small>
              </div>

              <ChevronRight size={16} />
            </button>

            <button className="menu-item">
              <div className="menu-item-icon">
                <MapPin size={18} />
              </div>

              <div className="menu-item-content">
                <strong>Search preferences</strong>
                <small>Manage your locations</small>
              </div>

              <ChevronRight size={16} />
            </button>

            <button className="menu-item">
              <div className="menu-item-icon">
                <Settings size={18} />
              </div>

              <div className="menu-item-content">
                <strong>Account settings</strong>
                <small>Privacy and preferences</small>
              </div>

              <ChevronRight size={16} />
            </button>

            <button className="menu-item logout">
              <div className="menu-item-icon">
                <LogOut size={18} />
              </div>

              <div className="menu-item-content">
                <strong>Log out</strong>
                <small>Leave your account</small>
              </div>

              <ChevronRight size={16} />
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}