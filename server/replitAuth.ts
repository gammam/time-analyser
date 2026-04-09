// Local development auth: always use a fixed fake user.
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

const LOCAL_DEV_USER_ID = "local-dev-user";

export function isLocalAuthBypassed() {
  return true;
}

export function getLocalDevUser() {
  return {
    id: LOCAL_DEV_USER_ID,
    email: "local@example.com",
    firstName: "Local",
    lastName: "Developer",
    profileImageUrl: null,
    hasCompletedOnboarding: 1,
  };
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.get("/api/login", (_req, res) => {
    res.redirect("/");
  });

  app.get("/api/callback", (_req, res) => {
    res.redirect("/");
  });

  app.get("/api/logout", (_req, res) => {
    res.redirect("/");
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  (req as any).user = {
    claims: { sub: LOCAL_DEV_USER_ID },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  return next();
};
