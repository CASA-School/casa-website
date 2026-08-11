import {
  BookOpen,
  Calendar,
  Building,
  GraduationCap,
  Users,
  Globe,
  MapPin,
  Phone,
  Mail,
  FileText,
  Briefcase,
  Clock,
  HeartHandshake,
  MessageCircle,
  HelpCircle,
  Newspaper,
  Image as ImageIcon,
  CheckCircle2,
  Home,
  BedDouble,
  Key,
  Moon,
  Handshake,
  Stethoscope,
  Calculator,
  LucideIcon
} from 'lucide-react';

export type IconKey = 
  | 'courses' | 'intensive' | 'evening' | 'special' | 'medical' | 'bildungszeit' | 'inCompany'
  | 'exams' | 'telcB2' | 'telcC1' | 'testdaf' | 'examRegistration'
  | 'accommodation' | 'flats' | 'hostFamilies' | 'requestAccommodation' | 'becomeHost'
  | 'school' | 'mission' | 'team' | 'tandem' | 'partners' | 'gallery'
  | 'registration' | 'placementTest' | 'calculator' | 'contact' | 'faq' | 'news'
  | 'phone' | 'mail' | 'location' | 'globe' | 'check';

export const iconMap: Record<IconKey, LucideIcon> = {
  courses: BookOpen,
  intensive: Clock,
  evening: Moon,
  special: MessageCircle,
  medical: Stethoscope,
  bildungszeit: Calendar,
  inCompany: Briefcase,
  
  exams: GraduationCap,
  telcB2: FileText,
  telcC1: FileText,
  testdaf: FileText,
  examRegistration: CheckCircle2,
  
  accommodation: Home,
  flats: BedDouble,
  hostFamilies: Users,
  requestAccommodation: Key,
  becomeHost: HeartHandshake,
  
  school: Building,
  mission: Globe,
  team: Users,
  tandem: HeartHandshake,
  partners: Handshake,
  gallery: ImageIcon,
  
  registration: CheckCircle2,
  placementTest: FileText,
  calculator: Calculator,
  contact: Phone,
  faq: HelpCircle,
  news: Newspaper,
  
  phone: Phone,
  mail: Mail,
  location: MapPin,
  globe: Globe,
  check: CheckCircle2,
};
