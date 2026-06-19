import { motion } from 'framer-motion'

// Three-dot bounce shown as an empty AI bubble while the assistant is thinking.
export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex justify-start"
    >
      <div className="rounded-2xl rounded-tl-md border border-[#0B6477]/10 bg-[#F3F7F6] px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-2 w-2 rounded-full bg-[#0B6477]/55"
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
