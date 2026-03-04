import { motion, useMotionValue, useTransform } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, Target } from "lucide-react";

const supervisor = {
  name: "Dr. Nancy alshaer",
  role: "Project Supervisor",
  department: "electronic and communication engineering Department",
};

const team = [
  { name: "Abdelrahman Khaled Mohamed", role: "team leader" },
  { name: "Abdelrahman Mohamed Antar", role: "developer" },
  { name: "Ali Elsayed Shalaby", role: "developer" },
  { name: "Hatem Reda Abo Elnaga", role: "developer" },
  { name: "Islam Hany AlAshqar", role: "developer" },
  { name: "Mazen Mohamed AlNahrawy", role: "developer" },
  { name: "Mohamed Elsayed Sobhy", role: "developer" },
  { name: "Mohamed Safwat Mohamed", role: "developer" },
  { name: "Sabry Abdelrazek Ibrahim", role: "developer" },
].sort((a, b) => a.name.localeCompare(b.name));

// 3D TILT CARD COMPONENT
function TiltCard({ children }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-50, 50], [15, -15]);
  const rotateY = useTransform(x, [-50, 50], [-15, 15]);

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="transition-transform duration-300"
    >
      {children}
    </motion.div>
  );
}

// PAGE ANIMATIONS
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 35 },
  visible: { opacity: 1, y: 0 },
};

export default function AboutUs() {
  return (
    <motion.div
      className="p-6 space-y-8"
      variants={pageVariants}
      initial="visible"
      animate="visible"
      data-testid="page-about-us"
    >
      <motion.div variants={itemVariants} className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Meet Our Team</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A dedicated group of security professionals and developers working together 
          to build cutting-edge vulnerability scanning solutions
        </p>
      </motion.div>

      {/* PROJECT HIGHLIGHTS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-card-border">
          <CardContent className="p-6 text-center">
            <Target className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Our Mission</h3>
            <p className="text-sm text-muted-foreground">
              Empowering developers with tools to identify and fix security vulnerabilities
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6 text-center">
            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Team Size</h3>
            <p className="text-sm text-muted-foreground">
              9 talented developers with diverse skill sets
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6 text-center">
            <Award className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Expertise</h3>
            <p className="text-sm text-muted-foreground">
              Combining security, development, and user experience
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* SUPERVISOR SECTION */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <TiltCard>
          <Card className="w-full max-w-lg bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-primary">
                  {supervisor.name.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{supervisor.name}</h2>
              <p className="text-primary font-medium mb-2">{supervisor.role}</p>
              <p className="text-sm text-muted-foreground">{supervisor.department}</p>
            </CardContent>
          </Card>
        </TiltCard>
      </motion.div>

      {/* TEAM GRID */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-semibold text-foreground text-center mb-6">Development Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member, index) => (
            <motion.div key={index} variants={itemVariants}>
              <TiltCard>
                <Card className="h-full bg-card border-card-border hover:border-primary/50 transition-colors duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="text-lg font-bold text-primary">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {member.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </CardContent>
                </Card>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CLOSING NOTE */}
      <motion.div variants={itemVariants} className="text-center">
        <Card className="bg-card border-card-border max-w-2xl mx-auto">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              This project represents our commitment to making the web a safer place. 
              Each team member brings unique skills and perspectives, united by our 
              passion for cybersecurity and software excellence.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}