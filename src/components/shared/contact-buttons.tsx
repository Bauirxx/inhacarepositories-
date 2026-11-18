import { Globe, Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, safeExternalUrl, telLink, whatsappLink } from "@/lib/utils";

interface ContactButtonsProps {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  message?: string;
  className?: string;
  compact?: boolean;
}

export function ContactButtons({ phone, whatsapp, email, website, message, className, compact }: ContactButtonsProps) {
  const wa = whatsappLink(whatsapp || phone, message);
  const tel = telLink(phone || whatsapp);
  const site = safeExternalUrl(website);
  if (!wa && !tel && !email && !site) {
    return <p className="text-sm text-muted-foreground">Sem contactos disponíveis.</p>;
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {wa ? (
        <Button asChild className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" size={compact ? "sm" : "default"}>
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle /> WhatsApp
          </a>
        </Button>
      ) : null}
      {tel ? (
        <Button asChild variant="outline" size={compact ? "sm" : "default"}>
          <a href={tel}>
            <Phone /> Ligar
          </a>
        </Button>
      ) : null}
      {email ? (
        <Button asChild variant="outline" size={compact ? "sm" : "default"}>
          <a href={`mailto:${email}`}>
            <Mail /> Email
          </a>
        </Button>
      ) : null}
      {site ? (
        <Button asChild variant="outline" size={compact ? "sm" : "default"}>
          <a href={site} target="_blank" rel="noopener noreferrer nofollow">
            <Globe /> Website
          </a>
        </Button>
      ) : null}
    </div>
  );
}
