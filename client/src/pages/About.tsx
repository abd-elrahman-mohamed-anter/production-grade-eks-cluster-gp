import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Code, Users, Award, Zap, Network, Search, Cpu } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();
  const [openTool, setOpenTool] = useState<string | undefined>(undefined);

  useEffect(() => {
    // open the relevant tool accordion item when URL has a hash like #nikto
    try {
      const h = (window.location.hash || "").replace("#", "");
      if (!h) return;
      const map: Record<string, string> = {
        httpx: "tool-httpx",
        nmap: "tool-nmap",
        nikto: "tool-nikto",
        zap: "tool-zap",
      };
      if (map[h]) {
        setOpenTool(map[h]);
        // scroll to the section if present
        const el = document.getElementById(h);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (e) {
      // ignore
    }
  }, []);
  return (
    <div className="p-6 space-y-8" data-testid="page-about">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Web Vulnerability Scanner</h1>
        <p className="text-muted-foreground text-lg">
          A comprehensive security assessment solution for modern web applications
        </p>
      </div>

      {/* Main Description */}
      <Card className="bg-card border-card-border border-l-4 border-l-primary">
        <CardContent className="p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Our platform is a comprehensive web vulnerability assessment solution designed to help
            security researchers, developers, and penetration testers identify, analyze, and mitigate
            security risks across web applications and network services.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By integrating multiple industry-proven security tools such as OWASP ZAP, Nmap, Nikto,
            and Httpx, we provide a deeper and more accurate security assessment than traditional
            single-tool scanners.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our scanning engine covers a wide range of vulnerabilities including XSS, SQL Injection,
            CSRF, Security Misconfigurations, Exposed Services, Weak Headers, and other critical
            issues aligned with the OWASP Top 10 and modern penetration testing methodologies.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OWASP ZAP */}
          <Card className="bg-card border-card-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <h3 id="zap" className="font-semibold text-foreground">OWASP ZAP</h3>
                  <p className="text-sm text-muted-foreground">
                    Dynamic application security testing (DAST) that crawls and actively tests web applications at runtime. ZAP simulates attacker interactions to find issues such as XSS, SQL injection, CSRF, broken authentication, insecure headers, and other runtime vulnerabilities. It supports authenticated scans, scripting, and customizable rulesets for deep application analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nmap */}
          <Card className="bg-card border-card-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Network className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <h3 id="nmap" className="font-semibold text-foreground">Nmap</h3>
                  <p className="text-sm text-muted-foreground">
                    Network and service discovery tool used to identify open ports, running services, versions and potential attack surfaces. Nmap can run NSE scripts to fingerprint services and detect common misconfigurations, helping prioritize which targets and services to examine at the application layer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nikto */}
          <Card className="bg-card border-card-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Search className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <h3 id="nikto" className="font-semibold text-foreground">Nikto</h3>
                  <p className="text-sm text-muted-foreground">
                    Web server scanner that checks for outdated server software, unsafe default files, insecure headers, and known vulnerabilities. Nikto complements application scanners by highlighting server-level issues and misconfigurations that could expose sensitive files or increase attack surface.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Httpx */}
          <Card className="bg-card border-card-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Cpu className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <h3 id="httpx" className="font-semibold text-foreground">Httpx</h3>
                  <p className="text-sm text-muted-foreground">
                    Fast HTTP probing utility used to validate reachable hosts, enumerate endpoints, capture response headers/status codes, detect redirects and TLS information. Httpx is used as a quick pre-scan to filter unreachable targets and collect metadata that guides deeper scanning stages.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-card-border">
          <CardContent className="p-6 text-center">
            <Code className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Open Source</h3>
            <p className="text-sm text-muted-foreground">
              Built on open-source technologies and security standards
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6 text-center">
            <Users className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Community Driven</h3>
            <p className="text-sm text-muted-foreground">
              Supported by a global community of security professionals
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6 text-center">
            <Award className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Industry Standard</h3>
            <p className="text-sm text-muted-foreground">
              Trusted by enterprises and security teams worldwide
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Version 1.2025 | Powered by OWASP Security Standards
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
