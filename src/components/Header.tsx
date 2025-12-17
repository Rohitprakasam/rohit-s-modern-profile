import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { name: "Home", href: "/#home" },
  { name: "About", href: "/#about" },
  { name: "Skills", href: "/#skills" },
  { name: "Internships", href: "/#experience" },
  { name: "Certificates", href: "/#certificates" },
  { name: "Projects", href: "/#projects" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/#contact" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems
        .filter(item => item.href.startsWith("/#"))
        .map(item => item.href.substring(2));

      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && window.scrollY >= (element.offsetTop - 100)) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(false);

    if (href.startsWith("/#")) {
      const targetId = href.substring(2);
      if (location.pathname !== "/") {
        navigate("/", { state: { scrollTo: targetId } });
      } else {
        const element = document.getElementById(targetId);
        element?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" onClick={(e) => handleNavClick("/", e)}>
            <img src="/favicon.png" alt="Logo" className="h-8 w-auto object-contain" />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive =
                (item.href === "/blog" && location.pathname.startsWith("/blog")) ||
                (item.href.startsWith("/#") && location.pathname === "/" && activeSection === item.href.substring(2));

              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className={`text-sm font-medium transition-colors duration-300 hover:text-primary ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {item.name}
                </a>
              );
            })}
          </nav>

          <a
            href="/#contact"
            onClick={(e) => handleNavClick("/#contact", e)}
            className="hidden md:inline-flex px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-medium text-sm transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
          >
            Hire Me
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pt-4 pb-2 animate-fade-in bg-background border-t border-border/50 absolute left-0 right-0 px-6 shadow-xl">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => {
                const isActive =
                  (item.href === "/blog" && location.pathname.startsWith("/blog")) ||
                  (item.href.startsWith("/#") && location.pathname === "/" && activeSection === item.href.substring(2));

                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleNavClick(item.href, e)}
                    className={`text-sm font-medium transition-colors duration-300 hover:text-primary ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {item.name}
                  </a>
                );
              })}
              <a
                href="/#contact"
                onClick={(e) => handleNavClick("/#contact", e)}
                className="inline-flex justify-center px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-medium text-sm"
              >
                Hire Me
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
