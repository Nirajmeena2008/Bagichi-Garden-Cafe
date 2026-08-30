import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export default function TestReveal() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-100%", "0%"]);

  return (
    <div ref={ref} className="relative overflow-hidden h-[400px] bg-red-500">
      <motion.div style={{ y }} className="w-full h-full bg-blue-500">
        <h1>Footer Reveal</h1>
      </motion.div>
    </div>
  )
}
