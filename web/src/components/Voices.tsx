import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { A } from "../lib/assets";
import { accent, body, display, serif } from "../lib/fonts";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function FarmerImage() {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // The image can fail before hydration, so onError alone never fires;
  // re-check the loaded state once mounted.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;
  return (
    <img
      ref={ref}
      src={A.farmerPhoto}
      alt="Farmer in the field"
      className="absolute inset-0 object-cover w-full h-full"
      onError={() => setFailed(true)}
    />
  );
}

const quote =
  "smartagri completely changed how our cooperative manages its fields. Instead of guessing when to irrigate or treat crops, we now act on real data, like having an agronomist watching every plot, day and night.";

export default function Voices() {
  return (
    <section className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ staggerChildren: 0.18 }}
          className="flex flex-col lg:flex-row justify-between items-stretch gap-8 lg:gap-[25px]"
        >
          <div className="flex flex-col lg:flex-row gap-[25px] items-stretch">
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-row lg:flex-col justify-between lg:h-full lg:min-h-[447px] gap-4 lg:gap-8 items-center lg:items-start"
            >
              <div className="flex flex-col gap-6 flex-1 lg:flex-none">
                <h2
                  className="text-3xl text-black font-medium leading-tight max-w-[260px]"
                  style={display}
                >
                  <span style={{ ...display, fontWeight: 500 }}>smartagri</span>{" "}
                  <span style={accent}>changed how we farm</span>
                </h2>
                <div className="hidden lg:flex items-center gap-2">
                  <div className="w-8 h-2 bg-[#0B6477] rounded-full" />
                  <div className="w-2 h-2 bg-stone-300 rounded-full" />
                  <div className="w-2 h-2 bg-stone-300 rounded-full" />
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                className="self-start bg-[#0B6477] text-white px-7 py-3 rounded-2xl text-xl font-medium hover:bg-[#14919B] transition-colors whitespace-nowrap"
                style={body}
              >
                Read More
              </motion.button>
            </motion.div>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col gap-3 w-full lg:w-[282px]"
            >
              <div className="w-full h-[280px] lg:h-[351px] rounded-2xl overflow-hidden relative bg-[#F3F5F4]">
                {/* TODO: farmer.jpg is missing; brand-tinted block with the color icon
                    stands in until it lands in public/brand/ */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={A.iconColor} alt="" className="h-20 w-auto opacity-60" />
                </div>
                <FarmerImage />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: 0.4, duration: 0.55, ease: "easeOut" }}
                className="w-full h-24 rounded-2xl flex items-center justify-center gap-3 bg-[#F1F0EF]"
              >
                {/* Placeholder partner; replace with a real partner and its logo */}
                <img src={A.iconColor} alt="" className="h-8 w-auto" />
                <span
                  className="text-2xl md:text-3xl font-bold text-black"
                  style={display}
                >
                  GreenField
                </span>
              </motion.div>
            </motion.div>
          </div>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[748px] flex-1 p-10 rounded-2xl flex flex-col justify-between gap-10 bg-[#0B6477]/10"
          >
            <p
              className="text-2xl md:text-3xl font-normal leading-snug md:leading-10 text-black"
              style={serif}
            >
              {quote.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.35,
                    delay: 0.4 + i * 0.04,
                    ease: "easeOut",
                  }}
                  className="inline-block mr-[0.25em]"
                >
                  {word}
                </motion.span>
              ))}
            </p>
            {/* Placeholder testimonial; replace with a real one */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col gap-1"
            >
              <span
                className="text-lg md:text-xl text-black"
                style={accent}
              >
                Bayu Pratama,
              </span>
              <span
                className="text-base md:text-lg font-normal text-black/50"
                style={body}
              >
                Farm Cooperative Lead, Sleman
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
