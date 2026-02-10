"use client";

import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useContactDrawer } from "./contact-drawer";

export function ContactFab({ source }: { source?: string }) {
  const { open, ContactDrawerComponent } = useContactDrawer();

  return (
    <>
      <ContactDrawerComponent />

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        onClick={() => open(source)}
        className="group fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/40 md:right-10 md:bottom-10"
        aria-label="联系我们"
      >
        <MessageCircle className="h-6 w-6 transition-transform group-hover:scale-110" />

        {/* 脉冲动画 */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
      </motion.button>
    </>
  );
}
