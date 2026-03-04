import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

const faqs = [
  {
    question: "What types of vulnerabilities can ZAP detect?",
    answer:
      "ZAP can detect a wide range of vulnerabilities including Cross-Site Scripting (XSS), SQL Injection, Cross-Site Request Forgery (CSRF), security misconfigurations, broken authentication, sensitive data exposure, and many more from the OWASP Top 10 list.",
  },
  {
    question: "How long does a scan typically take?",
    answer:
      "Scan duration depends on the size and complexity of the target website. A quick scan typically takes 5-15 minutes, while a comprehensive deep scan can take several hours for large applications with many pages and endpoints.",
  },
  {
    question: "Is it safe to scan my production website?",
    answer:
      "While ZAP is designed to be safe, we recommend testing on staging environments first. Some active scanning techniques may cause load on your servers or trigger security alerts. Always ensure you have proper authorization before scanning any website.",
  },
  {
    question: "Can I schedule automated scans?",
    answer:
      "Yes! ZAP supports scheduled scanning. You can configure daily, weekly, or monthly scans through the Scheduling page. This helps maintain continuous security monitoring of your web applications.",
  },
  {
    question: "How do I interpret scan results?",
    answer:
      "Scan results are categorized by severity: Critical, High, Medium, and Low. Each finding includes a description, affected URL, and remediation guidance. Start by addressing Critical and High severity issues first.",
  },
  {
    question: "Can I export scan reports?",
    answer:
      "Yes, reports can be exported in multiple formats including JSON, HTML, and PDF. Navigate to the Reports page to download or share your scan results with team members.",
  },
  {
    question: "Do I need technical expertise to use ZAP?",
    answer:
      "ZAP is designed to be user-friendly with an intuitive interface. Basic scans require only a URL. However, for advanced configurations and understanding detailed vulnerabilities, some security knowledge is helpful.",
  },
  {
    question: "How do I get API access?",
    answer:
      "API keys can be generated from the Settings page. The API allows you to integrate ZAP scanning into your CI/CD pipeline or custom security workflows.",
  },
];

export default function FAQ() {
  const [openValue, setOpenValue] = useState<string | null>(null);

  useEffect(() => {
    const openFromHash = () => {
      const h = (window.location.hash || "").replace("#", "");
      if (!h) return;
      const allowed = new Set(["scan-types", "scan-blocked", ...faqs.map((_, i) => `faq-${i}`)]);
      if (allowed.has(h)) setOpenValue(h);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <div className="p-6 space-y-6" data-testid="page-faq">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground flex items-baseline gap-3">
          <span className="text-2xl font-bold uppercase tracking-widest">FAQ</span>
          <span className="text-base text-muted-foreground font-normal">Frequently Asked Questions</span>
        </h1>
      </div>

      <Accordion type="single" collapsible className="w-full" value={openValue ?? undefined} onValueChange={(v) => setOpenValue(v)}>
        <AccordionItem value="scan-types">
          <AccordionTrigger id="scan-types">Scan Types — What they mean</AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground mt-2 space-y-3">
              <p className="mb-2 text-base"><strong>Shallow:</strong> Quick reachability and header checks using Httpx and a lightweight ZAP spider. Fast and CI-friendly; minimal server load. Uses a short spider and basic HTTP probing to confirm endpoints are live and returning expected headers.</p>
              <p className="mb-2 text-base"><strong>Medium:</strong> Adds Nmap top-port discovery and limited Nikto checks plus deeper ZAP crawling and standard active tests. Balanced between coverage and speed. Medium scans probe common ports, run targeted Nikto checks for server misconfigurations, and execute a more thorough ZAP active scan for typical application issues.</p>
              <p className="mb-2 text-base"><strong>Deep:</strong> Full Nmap discovery, comprehensive Nikto scans, and deep ZAP active scanning with long timeouts. Intended for thorough security audits; can be resource- and time-intensive. Deep scans include service fingerprinting, extended Nikto checks, and the full ZAP ruleset to catch complex or chained vulnerabilities.</p>
              <p className="mb-0 text-sm">Use shallow for quick smoke tests, medium for staging environments, and deep for full pre-release audits. If unsure, start medium and escalate as needed. Note: scan durations and resource usage depend heavily on the application's size and responsiveness.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scan-blocked">
          <AccordionTrigger id="scan-blocked">Blocked Targets</AccordionTrigger>
          <AccordionContent>
            <section>
              <p className="text-sm text-muted-foreground">
                Certain public platforms are intentionally blocked from scanning to avoid causing service disruption, triggering abuse protection, or getting our scanning infrastructure IPs flagged.
              </p>
              <p className="mt-2 text-sm">
                Common examples: <strong>youtube.com</strong>, <strong>google.com</strong>, <strong>facebook.com</strong>, <strong>twitter.com</strong>, <strong>instagram.com</strong>, <strong>linkedin.com</strong>, <strong>tiktok.com</strong>.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                If you need to scan third-party services, request explicit permission and use dedicated authorized testing environments. For your own applications, use shallow/medium/deep scans as appropriate.
              </p>
            </section>
          </AccordionContent>
        </AccordionItem>

        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger id={`faq-${index}`}>{faq.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}

      </Accordion>
    </div>
  );
}
