export {};

declare global {
  interface CustomJwtSessionClaims {
    publicMetadata: {
      role?: AppRole;
    };
  }
}

// Augment Clerk's user publicMetadata type
declare global {
  interface UserPublicMetadata {
    role?: AppRole;
  }
}

export type AppRole = "superadmin" | "admin" | "manager" | "accountant" | "employee";
