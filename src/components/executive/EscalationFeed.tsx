"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

interface Escalation {
  id: string;
  type: string;
  severity: number;
  reportedAt: string;
  zoneName: string;
  status: string;
}

interface EscalationFeedProps {
  escalations: Escalation[];
}

export function EscalationFeed({ escalations }: EscalationFeedProps) {
  const t = useTranslations("executive");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col rounded-card border border-border bg-base-card shadow-lg h-[400px]">
      <div className="p-4 border-b border-border bg-base-elevated flex justify-between items-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-red flex items-center gap-2">
          {t("escalations")}
          {escalations.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white animate-pulse">
              {escalations.length}
            </span>
          )}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {escalations.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-text-muted mt-10"
            >
              {t("noEscalations")}
            </motion.div>
          )}
          {escalations.map((esc, i) => {
            const reportedTime = new Date(esc.reportedAt).getTime();
            const overSlaMins = Math.floor((now - reportedTime) / 60000) - 30; // 30 mins SLA
            
            return (
              <motion.div
                key={esc.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-accent-red/50 bg-accent-red/5 p-3 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text-primary text-sm uppercase">
                    {esc.type}
                  </span>
                  <span className="bg-accent-red text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                    S{esc.severity}
                  </span>
                </div>
                <div className="flex justify-between items-end text-xs">
                  <div className="text-text-muted">
                    <p>{esc.zoneName}</p>
                    <p className="font-mono mt-1">{new Date(esc.reportedAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-accent-red font-bold">
                      {t("minsOverSla", { mins: overSlaMins > 0 ? overSlaMins : 0 })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
