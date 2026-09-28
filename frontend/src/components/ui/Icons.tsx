import React from 'react'
import { Banknote, Bell, BookOpen, Briefcase, Building2, CalendarDays, Camera, ChartColumn, CircleCheck, ClipboardList, Clock, FileText, Folder, GraduationCap, House, Inbox, Lock, Megaphone, Pin, Plus, QrCode, RefreshCw, Star, TriangleAlert, Trophy, UserRound, Users } from 'lucide-react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: number
}

export function IconHome({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <House className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconCalendar({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <CalendarDays className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconClock({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Clock className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconDocument({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <FileText className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconClipboard({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <ClipboardList className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconChart({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <ChartColumn className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconCheckCircle({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <CircleCheck className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconExclamation({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <TriangleAlert className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconUsers({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Users className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconAcademicCap({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <GraduationCap className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconMegaphone({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Megaphone className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconTrophy({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Trophy className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconBriefcase({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Briefcase className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconBuilding({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Building2 className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconQrCode({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <QrCode className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconPin({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <Pin className={className} aria-hidden="true" {...props} />
  )
}

export function IconPlus({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <Plus className={className} strokeWidth={2} aria-hidden="true" {...props} />
  )
}

export function IconUser({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <UserRound className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconInbox({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Inbox className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconBanknotes({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Banknote className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconBook({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <BookOpen className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconStar({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Star className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconLockClosed({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Lock className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconCamera({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Camera className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconFolder({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Folder className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconRefresh({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <RefreshCw className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

export function IconBell({ className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <Bell className={className} strokeWidth={1.8} aria-hidden="true" {...props} />
  )
}

