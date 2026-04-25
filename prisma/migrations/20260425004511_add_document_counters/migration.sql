-- CreateTable
CREATE TABLE "DocumentCounter" (
    "prefix" TEXT NOT NULL,
    "nextVal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("prefix")
);
