import '@/styles/main.css'

const BuyMeCoffeeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.5 5H18.5V4H3.5V18C3.5 19.1046 4.39543 20 5.5 20H16.5C17.6046 20 18.5 19.1046 18.5 18V14H20.5C21.6046 14 22.5 13.1046 22.5 12V7C22.5 5.89543 21.6046 5 20.5 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

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
            <a 
              href="https://buymeacoffee.com/3az1le" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link coffee-link"
            >
              <BuyMeCoffeeIcon />
              <span>Buy me a coffee</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
} 
