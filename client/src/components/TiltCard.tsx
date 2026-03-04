import { motion, useMotionValue, useTransform } from "framer-motion";

export default function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-150, 150], [15, -15]);
  const rotateY = useTransform(x, [-150, 150], [-15, 15]);

  return (
    <motion.div
      className="relative rounded-2xl transition-shadow duration-300"
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={{
        scale: 1.08,
        transition: { type: "spring", stiffness: 200, damping: 15 },
      }}
    >
      {/* Light Reflection */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.35), transparent 60%)",
          opacity: useTransform(y, [-150, 150], [0.4, 0.1]),
        }}
      />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
