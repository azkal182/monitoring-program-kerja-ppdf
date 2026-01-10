import type { NextAuthConfig } from "next-auth";

// This config is used by both the middleware (Edge) and the full auth
// The authorize function that uses Prisma is only in the full auth config
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const userRole = auth?.user?.role;

      // Public routes
      const publicRoutes = ["/login"];
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (isPublicRoute) {
        if (isLoggedIn && pathname === "/login") {
          // Redirect based on role after login
          if (userRole === "ANGGOTA") {
            return Response.redirect(new URL("/field/today", nextUrl));
          }
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // API routes starting with /api/auth are public
      if (pathname.startsWith("/api/auth")) {
        return true;
      }

      // All other routes require authentication
      if (!isLoggedIn) {
        return false; // Redirect to login
      }

      // Role-based access control
      const isFieldRoute = pathname.startsWith("/field");
      const isDashboardRoute = pathname.startsWith("/dashboard");
      const isApiRoute = pathname.startsWith("/api");
      const isRootRoute = pathname === "/";

      // ANGGOTA can only access /field routes and related APIs
      if (userRole === "ANGGOTA") {
        if (isDashboardRoute) {
          return Response.redirect(new URL("/field/today", nextUrl));
        }
        // Allow API routes for field app functionality
        if (isApiRoute) {
          // Restrict admin-only APIs
          const adminOnlyApis = [
            "/api/divisions",
            "/api/users",
            "/api/programs",
          ];
          const isAdminApi = adminOnlyApis.some(
            (api) => pathname.startsWith(api) && !pathname.includes("/field")
          );
          if (isAdminApi && !pathname.includes("sessions")) {
            return Response.redirect(new URL("/field/today", nextUrl));
          }
        }
        if (isRootRoute) {
          return Response.redirect(new URL("/field/today", nextUrl));
        }
      }

      // ADMIN cannot access field routes (optional - remove if admin should access field)
      if (userRole === "ADMIN" && isFieldRoute) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Root redirect based on role
      if (isRootRoute) {
        if (userRole === "ANGGOTA") {
          return Response.redirect(new URL("/field/today", nextUrl));
        }
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.divisionId = user.divisionId;
        token.divisionName = user.divisionName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as "ADMIN" | "KOORDINATOR" | "ANGGOTA";
        session.user.divisionId = token.divisionId as string | null;
        session.user.divisionName = token.divisionName as string | null;
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export default authConfig;
