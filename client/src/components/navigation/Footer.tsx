import { footerLinkGroups } from "../../data/siteContent";
import FooterColumn from "./FooterColumn";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__grid">
          <div>
            <div className="brand">
              <span className="brand__mark" />
              <span>SignalPulse</span>
            </div>
            <p className="card__description">
              A structured crypto intelligence platform built for market awareness, decision clarity, and repeatable execution.
            </p>
          </div>
          {footerLinkGroups.map((group) => <FooterColumn key={group.title} group={group} />)}
        </div>
        <div className="footer__bottom">
          <span>SignalPulse platform system</span>
          <span>Calm tooling for faster crypto decisions</span>
        </div>
      </div>
    </footer>
  );
}


