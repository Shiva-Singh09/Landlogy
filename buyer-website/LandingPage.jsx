import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  User,
  Home,
  Building2,
  Briefcase,
  Trees,
  Crown,
  MapPin,
  BedDouble,
  Maximize2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

import "./LandingPage.css";
import ProfilePage from "./profilePage";

const CATEGORIES = [
  {
    label: "Buy",
    text: "Find your next home",
    Icon: Home,
    gradient: "var(--g-sunset)",
  },
  {
    label: "Rent",
    text: "Spaces that fit your life",
    Icon: Building2,
    gradient: "var(--g-ocean)",
  },
  {
    label: "Commercial",
    text: "Build your business",
    Icon: Briefcase,
    gradient: "var(--g-royal)",
  },
  {
    label: "Plots & Land",
    text: "Start from the ground up",
    Icon: Trees,
    gradient: "var(--g-ocean)",
  },
  {
    label: "Luxury",
    text: "Exceptional properties",
    Icon: Crown,
    gradient: "var(--g-sunset)",
  },
];

const PROPERTIES = [
  {
    name: "Seaside Villa",
    location: "Goa, India",
    price: "₹2.8 Cr",
    beds: "4 BHK",
    area: "3,500 sq ft",
    badge: "Verified",
    badgeIcon: ShieldCheck,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Green Valley Residences",
    location: "Bengaluru, India",
    price: "₹1.2 Cr",
    beds: "3 BHK",
    area: "1,800 sq ft",
    badge: "Featured",
    badgeIcon: Sparkles,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Skyline Penthouse",
    location: "Mumbai, India",
    price: "₹4.5 Cr",
    beds: "4 BHK",
    area: "4,200 sq ft",
    badge: "Luxury",
    badgeIcon: Crown,
    image:
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=85",
  },
];

const NAV_LINKS = ["Buy", "Rent", "Commercial", "Plots & Land", "Luxury"];

// ---- Animated counter used in the trust section ----
function Counter({ value, duration = 1500 }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const match = String(value).match(/^([\d,]+)(.*)$/);
    const numeric = match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
    const suffix = match ? match[2] : "";

    const el = ref.current;
    if (!el) return;

    const animate = () => {
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(numeric * eased);

        setDisplay(`${current.toLocaleString()}${suffix}`);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            animate();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [value, duration]);

  return <strong ref={ref}>{display}</strong>;
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;

      document.documentElement.style.setProperty("--mx", x);
      document.documentElement.style.setProperty("--my", y);

      document.documentElement.style.setProperty(
        "--mxpx",
        `${e.clientX}px`
      );

      document.documentElement.style.setProperty(
        "--mypx",
        `${e.clientY}px`
      );
    };

    const handleScroll = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress =
        maxScroll > 0 ? window.scrollY / maxScroll : 0;

      document.documentElement.style.setProperty(
        "--sy",
        `${window.scrollY}px`
      );

      document.documentElement.style.setProperty(
        "--progress",
        progress
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToProperties = () => {
    document
      .getElementById("properties")
      ?.scrollIntoView({ behavior: "smooth" });

    setMenuOpen(false);
  };
  if (showProfile) {
  return <ProfilePage onBack={() => setShowProfile(false)} />;
}

  return (
    <div className="landogy-page">
      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="nav-inner">
          <a href="#" className="logo">
            <span className="logo-mark">
              <img src="/Logo.png" alt="Landlogy" />
            </span>
          </a>

          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => {
                  if (link === "Buy") {
                    scrollToProperties();
                  }
                  setMenuOpen(false);
                }}
              >
                {link}
              </button>
            ))}
          </nav>

          <div className="nav-actions">
            <button className="nav-icon">
              <Search size={19} />
            </button>

            <button
  className="nav-icon"
  onClick={() => setShowProfile(true)}
  aria-label="Open profile"
>
  <User size={19} />
</button>

            <button
              className="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <main>
        <section className="hero">
          <div className="hero-background" />

          <div className="hero-content">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                PROPERTY, THOUGHTFULLY DISCOVERED
              </div>

              <h1>
                Find a place
                <br />
                that feels{" "}
                <span>like yours.</span>
              </h1>

              <p>
                Discover homes, neighbourhoods and spaces that match
                the way you want to live, work and grow.
              </p>

              <div className="hero-buttons">
                <button
                  className="btn btn-primary"
                  onClick={scrollToProperties}
                >
                  Explore properties
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* SEARCH BOX */}
              <div className="hero-search">
                <div className="search-icon">
                  <Search size={20} />
                </div>

                <div className="search-content">
                  <span>Search by location</span>
                  <strong>Where do you want to live?</strong>
                </div>

                <button onClick={scrollToProperties}>
                  Search
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* HERO PROPERTY PEEK */}
          <div className="property-peek">
            <div className="peek-image">
              <img src="/prop.jpg" alt="Premium property" />

              <div className="peek-overlay" />

              <div className="peek-badge">
                <ShieldCheck size={15} />
                Verified property
              </div>

              <div className="peek-info">
                <span>Featured residence</span>
                <strong>₹2.8 Cr</strong>
              </div>
            </div>
          </div>

          <div className="hero-scroll">
            <span>Scroll to explore</span>
            <div className="scroll-line">
              <span />
            </div>
          </div>
        </section>

        {/* ================= CATEGORIES ================= */}
        <section className="categories-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  EXPLORE PROPERTY
                </span>

                <h2>
                  Find the right
                  <br />
                  <span>kind of space.</span>
                </h2>
              </div>

              <p>
                From your first home to your next investment,
                explore spaces built around your priorities.
              </p>
            </div>

            <div className="category-grid">
              {CATEGORIES.map((category, index) => {
                const Icon = category.Icon;

                return (
                  <button
                    className="category-card"
                    key={category.label}
                    style={{
                      "--category-gradient": category.gradient,
                      "--delay": `${index * 0.08}s`,
                    }}
                  >
                    <div className="category-icon">
                      <Icon size={23} strokeWidth={1.8} />
                    </div>

                    <div className="category-text">
                      <h3>{category.label}</h3>
                      <p>{category.text}</p>
                    </div>

                    <ArrowRight
                      className="category-arrow"
                      size={20}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= PROPERTIES ================= */}
        <section className="properties-section" id="properties">
          <div className="container">
            <div className="properties-top">
              <div>
                <span className="section-kicker">
                  CURATED FOR YOU
                </span>

                <h2>
                  Properties worth
                  <br />
                  <span>looking twice at.</span>
                </h2>
              </div>

              <button className="view-all">
                View all properties
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="property-grid">
              {PROPERTIES.map((property) => {
                const BadgeIcon = property.badgeIcon;

                return (
                  <article
                    className="property-card"
                    key={property.name}
                  >
                    <div className="property-image">
                      <img
                        src={property.image}
                        alt={property.name}
                      />

                      <div className="property-image-overlay" />

                      <span className="property-badge">
                        <BadgeIcon size={14} />
                        {property.badge}
                      </span>

                      <button className="property-view">
                        <ArrowRight size={17} />
                      </button>
                    </div>

                    <div className="property-body">
                      <div className="property-location">
                        <MapPin size={15} />
                        {property.location}
                      </div>

                      <h3>{property.name}</h3>

                      <div className="property-meta">
                        <span>
                          <BedDouble size={16} />
                          {property.beds}
                        </span>

                        <span>
                          <Maximize2 size={15} />
                          {property.area}
                        </span>
                      </div>

                      <div className="property-bottom">
                        <strong>{property.price}</strong>

                        <button>
                          View property
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= TRUST SECTION ================= */}
        <section className="trust-section">
          <div className="container">
            <div className="trust-card">
              <div className="trust-orb orb-one" />
              <div className="trust-orb orb-two" />

              <div className="trust-content">
                <span className="section-kicker light">
                  A BETTER PROPERTY JOURNEY
                </span>

                <h2>
                  Property decisions
                  <br />
                  should feel <em>confident.</em>
                </h2>

                <p>
                  Less noise. Better discovery. More confidence
                  when you're choosing the place you'll call yours.
                </p>

                <button className="btn btn-light">
                  Discover Landogy
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="trust-stats">
                <div>
                  <Counter value="10000+" />
                  <span>Properties</span>
                </div>

                <div>
                  <Counter value="50+" />
                  <span>Locations</span>
                </div>

                <div>
                  <Counter value="100%" />
                  <span>Curated</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= DISCOVERY ================= */}
        <section className="discovery-section">
          <div className="container discovery-grid">
            <div className="discovery-image">
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85"
                alt="Modern home interior"
              />

              <div className="discovery-floating">
                <span>THE LANDLOGY WAY</span>
                <strong>
                  A home is more than
                  <br />
                  an address.
                </strong>
              </div>
            </div>

            <div className="discovery-copy">
              <span className="section-kicker">
                BEYOND FOUR WALLS
              </span>

              <h2>
                Discover the
                <br />
                <span>life around it.</span>
              </h2>

              <p>
                The right property is not simply about square
                footage or a price tag. It is about the
                neighbourhood, the commute, the morning coffee,
                the people and the possibilities.
              </p>

              <div className="discovery-points">
                <div>
                  <span>01</span>
                  <strong>Neighbourhoods</strong>
                  <p>Understand the place before choosing it.</p>
                </div>

                <div>
                  <span>02</span>
                  <strong>Lifestyle</strong>
                  <p>Find spaces that fit how you actually live.</p>
                </div>

                <div>
                  <span>03</span>
                  <strong>Possibility</strong>
                  <p>See what your next chapter could look like.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= LIST PROPERTY CTA ================= */}
        <section className="listing-section">
          <div className="container">
            <div className="listing-card">
              <div className="listing-copy">
                <span className="section-kicker">
                  FOR PROPERTY OWNERS
                </span>

                <h2>
                  Your property
                  <br />
                  deserves the{" "}
                  <span>right audience.</span>
                </h2>

                <p>
                  Put your property in front of people who are
                  actively looking for their next place.
                </p>

                <button className="btn btn-primary">
                  List your property
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="listing-shape">
                <div className="shape-house">
                  <Home size={52} strokeWidth={1.1} />
                </div>

                <div className="shape-ring ring-one" />
                <div className="shape-ring ring-two" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="logo footer-logo">
                <span className="logo-mark">
                  <img src="/logo.png" alt="Landlogy" />
                </span>
                <span>Landlogy</span>
              </a>

              <p>
                Discover the place.
                <br />
                Imagine the life.
                <br />
                Make it yours.
              </p>
            </div>

            <div className="footer-links">
              <div>
                <strong>Explore</strong>
                <button>Buy</button>
                <button>Rent</button>
                <button>Commercial</button>
                <button>Plots & Land</button>
              </div>

              <div>
                <strong>Landlogy</strong>
                <button>About us</button>
                <button>Contact</button>
                <button>List property</button>
                <button>Careers</button>
              </div>

              <div>
                <strong>Connect</strong>
                <button>Instagram</button>
                <button>LinkedIn</button>
                <button>Facebook</button>
                <button>Newsletter</button>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Landlogy. All rights reserved.</span>

            <div>
              <button>Privacy</button>
              <button>Terms</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;