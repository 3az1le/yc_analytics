import '@/styles/globals.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <p className="footer-text">
              Unofficial data from Y Combinator
            </p>
          </div>
          <div className="footer-section footer-links">
            <a 
              href="https://github.com/3az1le/yc_analytics" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              View on GitHub
            </a>
            <div className="bmc-btn-container">
              <a 
                className="bmc-button" 
                target="_blank" 
                href="https://www.buymeacoffee.com/3az1le"
              >
                <img 
                  src="https://www.buymeacoffee.com/assets/img/BMC-btn-logo.svg" 
                  alt="Buy me a coffee"
                />
                <span>Buy me a coffee</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 
