"use client";

import React from "react";
import { NotificationProvider } from "./NotificationContext";
import AnnouncementPopupModal from "./AnnouncementPopupModal";

export default function NotificationCenter({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      {children}
      <AnnouncementPopupModal />
    </NotificationProvider>
  );
}
