-- CreateTable
CREATE TABLE "profiles" (
    "user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "birth_date" TIMESTAMP(3),
    "sex" TEXT,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "activity_level" TEXT,
    "weekly_activity" TEXT,
    "fitness_level" TEXT,
    "goals" TEXT[],
    "goal_other" TEXT,
    "medical_conditions" TEXT[],
    "allergies" TEXT,
    "medications" TEXT,
    "medical_other" TEXT,
    "meal_frequency" TEXT,
    "meal_frequency_other" TEXT,
    "food_choices" TEXT[],
    "food_other" TEXT,
    "notes" TEXT,
    "photo_url" TEXT,
    "image_path" TEXT,
    "daily_calories" INTEGER,
    "daily_protein" INTEGER,
    "targets_manual" BOOLEAN NOT NULL DEFAULT false,
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "family_id" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_meal_generation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ai_nutrition_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_options" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "list_key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "logo_url" TEXT,
    "logo_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "member_email" TEXT NOT NULL,
    "member_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "prep_time" INTEGER,
    "cook_time" INTEGER,
    "total_time" INTEGER,
    "difficulty" TEXT,
    "category" TEXT,
    "nutrition" JSONB,
    "notes" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "image_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "meal_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "aisle" TEXT NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "nutrition" JSONB,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("meal_id","id")
);

-- CreateTable
CREATE TABLE "steps" (
    "meal_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "time" INTEGER,
    "ingredients" JSONB,

    CONSTRAINT "steps_pkey" PRIMARY KEY ("meal_id","step_number")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "meal_id" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'a_faire',
    "meal_type" TEXT,
    "completed_steps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_items" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "aisle" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "store" TEXT,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_contributions" (
    "id" TEXT NOT NULL,
    "grocery_item_id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "grocery_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_aisles" (
    "name" TEXT NOT NULL,
    "label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "grocery_aisles_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "product_scans" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "image_url" TEXT,
    "score" INTEGER,
    "grade" TEXT NOT NULL,
    "positives" JSONB NOT NULL,
    "negatives" JSONB NOT NULL,
    "additives" JSONB,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_meal_jobs" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_meal_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "list_options_family_id_list_key_idx" ON "list_options"("family_id", "list_key");

-- CreateIndex
CREATE UNIQUE INDEX "list_options_family_id_list_key_value_key" ON "list_options"("family_id", "list_key", "value");

-- CreateIndex
CREATE INDEX "family_members_member_email_idx" ON "family_members"("member_email");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_family_id_member_email_key" ON "family_members"("family_id", "member_email");

-- CreateIndex
CREATE INDEX "meals_family_id_idx" ON "meals"("family_id");

-- CreateIndex
CREATE INDEX "ingredients_aisle_idx" ON "ingredients"("aisle");

-- CreateIndex
CREATE INDEX "meal_plans_family_id_from_date_to_date_idx" ON "meal_plans"("family_id", "from_date", "to_date");

-- CreateIndex
CREATE INDEX "grocery_items_family_id_aisle_idx" ON "grocery_items"("family_id", "aisle");

-- CreateIndex
CREATE INDEX "grocery_items_family_id_archived_idx" ON "grocery_items"("family_id", "archived");

-- CreateIndex
CREATE INDEX "grocery_contributions_grocery_item_id_idx" ON "grocery_contributions"("grocery_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "grocery_contributions_meal_plan_id_ingredient_id_key" ON "grocery_contributions"("meal_plan_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "product_scans_family_id_scanned_at_idx" ON "product_scans"("family_id", "scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_scans_family_id_barcode_key" ON "product_scans"("family_id", "barcode");

-- CreateIndex
CREATE INDEX "ai_meal_jobs_family_id_created_at_idx" ON "ai_meal_jobs"("family_id", "created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_options" ADD CONSTRAINT "list_options_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_contributions" ADD CONSTRAINT "grocery_contributions_grocery_item_id_fkey" FOREIGN KEY ("grocery_item_id") REFERENCES "grocery_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_contributions" ADD CONSTRAINT "grocery_contributions_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_scans" ADD CONSTRAINT "product_scans_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

