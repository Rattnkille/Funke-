import Link from "next/link";
import { currentUser } from "@/server/session";
import { SparkLogo } from "./Icons";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const user = await currentUser();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href={user ? "/start" : "/"} className="brand" aria-label="FUNKE, zur Startseite">
          <SparkLogo />
          FUNKE
        </Link>
        <nav className="nav" aria-label="Hauptnavigation">
          {user ? (
            <>
              <NavLinks />
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/anmelden">Anmelden</Link>
              <Link href="/registrieren">Konto erstellen</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
