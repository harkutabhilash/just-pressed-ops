


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."verify_password"("p_password" "text", "p_hash" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN p_hash = crypt(p_password, p_hash);
END;
$$;


ALTER FUNCTION "public"."verify_password"("p_password" "text", "p_hash" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "log_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" character varying(100) NOT NULL,
    "record_id" character varying(100),
    "action" character varying(20),
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp without time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_orders" (
    "batch_order_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid",
    "order_id" character varying(100),
    "awb_number" character varying(50),
    "order_status" character varying(20) DEFAULT 'pending'::character varying,
    "scanned_at" timestamp without time zone,
    "scanned_by" "uuid",
    "cancelled_at" timestamp without time zone,
    "cancelled_reason" "text",
    "pickup_completed_at" timestamp without time zone,
    "added_via" character varying(20),
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bottling_entries" (
    "id" bigint NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "bottles_filled" integer NOT NULL,
    "bottled_at_ist" "text" NOT NULL,
    "bottled_at_epoch" bigint NOT NULL,
    "created_by" "text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "bottling_entries_bottles_filled_check" CHECK (("bottles_filled" > 0))
);


ALTER TABLE "public"."bottling_entries" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bottling_entries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bottling_entries_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bottling_entries_id_seq" OWNED BY "public"."bottling_entries"."id";



CREATE TABLE IF NOT EXISTS "public"."channel_sku_mapping" (
    "mapping_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid",
    "channel_id" "uuid",
    "channel_sku_code" character varying(100) NOT NULL,
    "channel_sku_name" character varying(255),
    "channel_product_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."channel_sku_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "channel_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_name" character varying(100) NOT NULL,
    "channel_code" character varying(50) NOT NULL,
    "channel_type" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "customer_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" character varying(15) NOT NULL,
    "email" character varying(255),
    "customer_name" character varying(255) NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "city" character varying(100),
    "state" character varying(100),
    "pincode" character varying(10),
    "landmark" "text",
    "customer_type" character varying(20) DEFAULT 'retail'::character varying,
    "customer_tier" character varying(20) DEFAULT 'regular'::character varying,
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "marketing_consent" boolean DEFAULT true,
    "whatsapp_consent" boolean DEFAULT true,
    "first_order_date" "date",
    "last_order_date" "date",
    "total_orders" integer DEFAULT 0,
    "total_spent" numeric(10,2) DEFAULT 0,
    "average_order_value" numeric(10,2) DEFAULT 0,
    "preferred_products" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_active" boolean DEFAULT true,
    "merged_into" "uuid",
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispatch_items" (
    "item_id" bigint NOT NULL,
    "dispatch_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "quantity_dispatched" integer NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "dispatch_items_quantity_dispatched_check" CHECK (("quantity_dispatched" > 0))
);


ALTER TABLE "public"."dispatch_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."dispatch_items" IS 'SKU line items for each dispatch';



CREATE SEQUENCE IF NOT EXISTS "public"."dispatch_items_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dispatch_items_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dispatch_items_item_id_seq" OWNED BY "public"."dispatch_items"."item_id";



CREATE TABLE IF NOT EXISTS "public"."dispatches" (
    "dispatch_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_location_id" "uuid" NOT NULL,
    "shipped_to" "text" NOT NULL,
    "dispatch_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "dispatched_at_ist" "text",
    "dispatched_at_epoch" bigint,
    "dispatched_by" "uuid",
    "remarks" "text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispatches" OWNER TO "postgres";


COMMENT ON TABLE "public"."dispatches" IS 'Outbound dispatches - products leaving our locations for customers/partners';



COMMENT ON COLUMN "public"."dispatches"."shipped_to" IS 'Free text field: courier name, customer name, or partner name';



CREATE TABLE IF NOT EXISTS "public"."filtering_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raw_material_id" "uuid" NOT NULL,
    "input_qty_kg" numeric(10,2) NOT NULL,
    "filtered_oil_kg" numeric(10,2),
    "location_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "start_time_ist" "text",
    "start_epoch" bigint,
    "stop_time_ist" "text",
    "stop_epoch" bigint,
    "machine_id" "uuid"
);


ALTER TABLE "public"."filtering_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_batches" (
    "inventory_batch_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "batch_code" character varying(50) NOT NULL,
    "purchase_date" "date",
    "supplier_id" "uuid",
    "quantity_received" numeric(10,2) NOT NULL,
    "quantity_remaining" numeric(10,2) NOT NULL,
    "unit_cost" numeric(10,2) NOT NULL,
    "total_cost" numeric(10,2) GENERATED ALWAYS AS (("quantity_remaining" * "unit_cost")) STORED,
    "expiry_date" "date",
    "location_id" "uuid",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."inventory_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_stock" (
    "stock_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "location_id" "uuid",
    "condition" character varying(20) DEFAULT 'good'::character varying,
    "quantity" numeric(10,2) DEFAULT 0 NOT NULL,
    "stock_value" numeric(10,2),
    "last_updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "invoice_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "order_id" character varying(50),
    "customer_id" "uuid",
    "invoice_date" "date" NOT NULL,
    "invoice_type" character varying(20) DEFAULT 'tax_invoice'::character varying,
    "financial_year" character varying(10),
    "subtotal" numeric(10,2) NOT NULL,
    "cgst_amount" numeric(10,2) DEFAULT 0,
    "sgst_amount" numeric(10,2) DEFAULT 0,
    "igst_amount" numeric(10,2) DEFAULT 0,
    "total_tax" numeric(10,2) GENERATED ALWAYS AS (((COALESCE("cgst_amount", (0)::numeric) + COALESCE("sgst_amount", (0)::numeric)) + COALESCE("igst_amount", (0)::numeric))) STORED,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS (((("subtotal" + COALESCE("cgst_amount", (0)::numeric)) + COALESCE("sgst_amount", (0)::numeric)) + COALESCE("igst_amount", (0)::numeric))) STORED,
    "invoice_pdf_url" "text",
    "customer_gstin" character varying(20),
    "place_of_supply" character varying(50),
    "reverse_charge" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "location_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_name" character varying(100) NOT NULL,
    "location_code" character varying(50) NOT NULL,
    "location_type" character varying(50),
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "pincode" character varying(10),
    "manager_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "google_maps_code" character varying,
    "landmark" character varying
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."locations"."google_maps_code" IS 'Google Maps Plus Code for precise location';



COMMENT ON COLUMN "public"."locations"."landmark" IS 'Nearby landmark for easy navigation';



CREATE TABLE IF NOT EXISTS "public"."machines" (
    "machine_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "machine_name" character varying(100) NOT NULL,
    "machine_code" character varying(50) NOT NULL,
    "machine_type" character varying(50),
    "location_id" "uuid",
    "capacity_per_hour" numeric(10,2),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "purchase_date" "date",
    "last_maintenance_date" "date",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "running_status" "text" DEFAULT 'idle'::"text" NOT NULL,
    CONSTRAINT "machines_running_status_check" CHECK (("running_status" = ANY (ARRAY['idle'::"text", 'in_use'::"text"])))
);


ALTER TABLE "public"."machines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manifest_batches" (
    "batch_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_code" character varying(50) NOT NULL,
    "channel_id" "uuid",
    "expected_pickup_date" "date" NOT NULL,
    "upload_type" character varying(20),
    "manifest_pdf_url" "text",
    "labels_pdf_url" "text",
    "total_orders" integer,
    "scanned_count" integer DEFAULT 0,
    "picked_count" integer DEFAULT 0,
    "cancelled_count" integer DEFAULT 0,
    "batch_status" character varying(20) DEFAULT 'created'::character varying,
    "pickup_completed_at" timestamp without time zone,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."manifest_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."materials" (
    "material_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_name" character varying(255) NOT NULL,
    "material_code" character varying(50) NOT NULL,
    "material_category" character varying(50),
    "unit" character varying(20),
    "reorder_level" numeric(10,2),
    "current_stock" numeric(10,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."materials_incoming" (
    "receipt_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid",
    "vendor_id" "uuid",
    "quantity" numeric(10,2) NOT NULL,
    "unit_cost" numeric(10,2),
    "total_cost" numeric(10,2),
    "received_date" "date" NOT NULL,
    "location_id" "uuid",
    "batch_code" character varying(50),
    "quality_check_status" character varying(20),
    "photo_url" "text",
    "notes" "text",
    "received_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."materials_incoming" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "module_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" character varying(100) NOT NULL,
    "module_key" character varying(50) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "display_order" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "order_item_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" character varying(50),
    "product_id" "uuid",
    "sku_id" "uuid",
    "channel_sku" character varying(100),
    "product_name" character varying(255),
    "quantity" integer NOT NULL,
    "unit_sold" character varying(20),
    "quantity_kg_equivalent" numeric(10,2),
    "unit_price" numeric(10,2) NOT NULL,
    "discount_per_unit" numeric(10,2) DEFAULT 0,
    "tax_per_unit" numeric(10,2) DEFAULT 0,
    "total_price" numeric(10,2) GENERATED ALWAYS AS ((("quantity")::numeric * (("unit_price" - COALESCE("discount_per_unit", (0)::numeric)) + COALESCE("tax_per_unit", (0)::numeric)))) STORED,
    "production_cost" numeric(10,2),
    "profit_per_unit" numeric(10,2) GENERATED ALWAYS AS (("unit_price" - COALESCE("production_cost", (0)::numeric))) STORED,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "order_id" character varying(50) NOT NULL,
    "customer_id" "uuid",
    "channel_id" "uuid",
    "channel_order_id" character varying(100),
    "order_date" timestamp without time zone NOT NULL,
    "order_status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_method" character varying(20),
    "subtotal" numeric(10,2),
    "discount_amount" numeric(10,2) DEFAULT 0,
    "shipping_charges" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS ((((COALESCE("subtotal", (0)::numeric) - COALESCE("discount_amount", (0)::numeric)) + COALESCE("shipping_charges", (0)::numeric)) + COALESCE("tax_amount", (0)::numeric))) STORED,
    "shipping_address" "jsonb",
    "billing_address" "jsonb",
    "awb_number" character varying(50),
    "courier_partner" character varying(100),
    "dispatch_batch_id" "uuid",
    "dispatched_at" timestamp without time zone,
    "delivered_at" timestamp without time zone,
    "cancelled_at" timestamp without time zone,
    "cancellation_reason" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_master" (
    "pricing_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "channel_id" "uuid",
    "cost_per_kg" numeric(10,2),
    "price_per_kg" numeric(10,2) NOT NULL,
    "price_per_ltr" numeric(10,2),
    "margin_percentage" numeric(5,2) GENERATED ALWAYS AS (((("price_per_kg" - COALESCE("cost_per_kg", (0)::numeric)) / NULLIF("price_per_kg", (0)::numeric)) * (100)::numeric)) STORED,
    "effective_from" "date" DEFAULT CURRENT_DATE,
    "effective_to" "date",
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_batches" (
    "batch_id" character varying(50) NOT NULL,
    "production_date" "date" NOT NULL,
    "machine_id" "uuid",
    "operator_id" "uuid",
    "seed_type" character varying(100) NOT NULL,
    "seed_input_kg" numeric(10,2) NOT NULL,
    "oil_output_kg" numeric(10,2),
    "cake_output_kg" numeric(10,2),
    "residual_waste_kg" numeric(10,2),
    "total_output_kg" numeric(10,2) GENERATED ALWAYS AS (((COALESCE("oil_output_kg", (0)::numeric) + COALESCE("cake_output_kg", (0)::numeric)) + COALESCE("residual_waste_kg", (0)::numeric))) STORED,
    "variance_kg" numeric(10,2) GENERATED ALWAYS AS (("seed_input_kg" - ((COALESCE("oil_output_kg", (0)::numeric) + COALESCE("cake_output_kg", (0)::numeric)) + COALESCE("residual_waste_kg", (0)::numeric)))) STORED,
    "variance_percentage" numeric(5,2) GENERATED ALWAYS AS (((("seed_input_kg" - ((COALESCE("oil_output_kg", (0)::numeric) + COALESCE("cake_output_kg", (0)::numeric)) + COALESCE("residual_waste_kg", (0)::numeric))) / NULLIF("seed_input_kg", (0)::numeric)) * (100)::numeric)) STORED,
    "batch_status" character varying(20) DEFAULT 'in_progress'::character varying,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    "raw_material_id" "uuid",
    "location_id" "uuid",
    "unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "start_time_ist" "text",
    "start_epoch" bigint,
    "end_time_ist" "text",
    "end_epoch" bigint
);


ALTER TABLE "public"."production_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_costs" (
    "cost_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" character varying(50),
    "seed_cost" numeric(10,2),
    "packaging_cost" numeric(10,2),
    "labour_cost" numeric(10,2),
    "operational_cost" numeric(10,2),
    "total_cost" numeric(10,2) GENERATED ALWAYS AS ((((COALESCE("seed_cost", (0)::numeric) + COALESCE("packaging_cost", (0)::numeric)) + COALESCE("labour_cost", (0)::numeric)) + COALESCE("operational_cost", (0)::numeric))) STORED,
    "cost_per_kg_oil" numeric(10,2),
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."production_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "product_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_code" character varying(50) NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "product_type" character varying(50),
    "base_unit" character varying(20) NOT NULL,
    "sales_unit" character varying(20),
    "conversion_factor" numeric(10,4),
    "size_value" numeric(10,2),
    "size_unit" character varying(20),
    "description" "text",
    "hsn_code" character varying(20),
    "gst_percentage" numeric(5,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "product_category" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."product_category" IS 'Lists the Product Category - Cold Pressed Oil, Cake, Ghee, Laddu etc';



CREATE TABLE IF NOT EXISTS "public"."raw_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."raw_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "item_id" bigint NOT NULL,
    "return_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "quantity_returned" integer NOT NULL,
    "physical_condition" "text" NOT NULL,
    "action_taken" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "return_items_action_taken_check" CHECK (("action_taken" = ANY (ARRAY['Restock'::"text", 'Dispose'::"text"]))),
    CONSTRAINT "return_items_physical_condition_check" CHECK (("physical_condition" = ANY (ARRAY['OK'::"text", 'Damaged'::"text", 'Leakage'::"text", 'Incorrect Product'::"text", 'Missing'::"text"]))),
    CONSTRAINT "return_items_quantity_returned_check" CHECK (("quantity_returned" > 0))
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."return_items" IS 'SKU line items for each return with condition and action';



COMMENT ON COLUMN "public"."return_items"."physical_condition" IS 'Physical state: OK, Damaged, Leakage, Incorrect Product, Missing';



COMMENT ON COLUMN "public"."return_items"."action_taken" IS 'Action: Restock (add to inventory) or Dispose (discard)';



CREATE SEQUENCE IF NOT EXISTS "public"."return_items_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."return_items_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."return_items_item_id_seq" OWNED BY "public"."return_items"."item_id";



CREATE TABLE IF NOT EXISTS "public"."returns" (
    "return_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" character varying(50),
    "awb_number" character varying(50),
    "return_date" "date" NOT NULL,
    "product_id" "uuid",
    "reason" "text",
    "escalation_required" boolean DEFAULT false,
    "escalation_status" character varying(20),
    "escalation_notes" "text",
    "inventory_adjusted" boolean DEFAULT false,
    "adjustment_date" timestamp without time zone,
    "scanned" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "received_location_id" "uuid",
    "received_at_ist" "text",
    "received_at_epoch" bigint,
    "received_by" "uuid",
    "remarks" "text",
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "videos" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


COMMENT ON TABLE "public"."returns" IS 'Shipment returns - products returned from customers/partners';



COMMENT ON COLUMN "public"."returns"."received_location_id" IS 'Location where return was received';



COMMENT ON COLUMN "public"."returns"."photos" IS 'Array of Cloudinary image URLs for evidence';



COMMENT ON COLUMN "public"."returns"."videos" IS 'Array of Cloudinary video URLs for evidence';



CREATE TABLE IF NOT EXISTS "public"."seed_output_expectations" (
    "expectation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seed_type" character varying(100) NOT NULL,
    "expected_oil_percentage" numeric(5,2) NOT NULL,
    "expected_cake_percentage" numeric(5,2) NOT NULL,
    "acceptable_waste_percentage" numeric(5,2) NOT NULL,
    "notes" "text",
    "effective_from" "date" DEFAULT CURRENT_DATE,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."seed_output_expectations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skus" (
    "sku_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "sku_code" character varying(50) NOT NULL,
    "bottle_size_ml" integer,
    "kg_per_unit" numeric(10,4),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "size_value" numeric(10,2),
    "size_unit" character varying(20),
    "variant_name" character varying(255),
    "short_description" "text",
    "mrp" numeric(10,2),
    "selling_price" numeric(10,2),
    "images_folder_url" "text",
    "videos_folder_url" "text",
    "barcode" character varying(20),
    "unit_selling_price" numeric(10,2)
);


ALTER TABLE "public"."skus" OWNER TO "postgres";


COMMENT ON COLUMN "public"."skus"."sku_code" IS 'Unique SKU code (e.g., GNO-1L, CNO-5L)';



COMMENT ON COLUMN "public"."skus"."bottle_size_ml" IS 'For liquids - size in ml (1000, 5000, 450, 100)';



COMMENT ON COLUMN "public"."skus"."kg_per_unit" IS 'Weight in kg - for inventory tracking';



COMMENT ON COLUMN "public"."skus"."size_value" IS 'Numeric size (1, 5, 450, 100, 15, 250, 500)';



COMMENT ON COLUMN "public"."skus"."size_unit" IS 'Unit (ltr, ml, kg, gm)';



COMMENT ON COLUMN "public"."skus"."variant_name" IS 'Display name (e.g., Groundnut Oil 1 Liter)';



COMMENT ON COLUMN "public"."skus"."mrp" IS 'Maximum Retail Price (printed on label)';



COMMENT ON COLUMN "public"."skus"."selling_price" IS 'Default/base selling price (can be overridden by channel)';



COMMENT ON COLUMN "public"."skus"."images_folder_url" IS 'Google Drive folder link for product images';



COMMENT ON COLUMN "public"."skus"."videos_folder_url" IS 'Google Drive folder link for product videos';



COMMENT ON COLUMN "public"."skus"."barcode" IS 'Product barcode (EAN-13) for scanning';



COMMENT ON COLUMN "public"."skus"."unit_selling_price" IS 'Price per ml/gm - for price comparison across sizes';



CREATE TABLE IF NOT EXISTS "public"."stock_movement_items" (
    "item_id" bigint NOT NULL,
    "movement_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_sent" integer NOT NULL,
    "reason" character varying(30) DEFAULT 'Fresh Stock'::character varying NOT NULL,
    "qty_received" integer,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "stock_movement_items_qty_sent_check" CHECK (("qty_sent" > 0)),
    CONSTRAINT "stock_movement_items_reason_check" CHECK ((("reason")::"text" = ANY ((ARRAY['Fresh Stock'::character varying, 'Expired'::character varying, 'Leakage'::character varying, 'Bad Packing'::character varying, 'Missing Label'::character varying, 'Reprocess'::character varying])::"text"[])))
);


ALTER TABLE "public"."stock_movement_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."stock_movement_items_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stock_movement_items_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stock_movement_items_item_id_seq" OWNED BY "public"."stock_movement_items"."item_id";



CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "movement_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_location_id" "uuid" NOT NULL,
    "to_location_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "sent_by" "uuid",
    "sent_at_ist" "text",
    "sent_at_epoch" bigint,
    "verified_by" "uuid",
    "verified_at_ist" "text",
    "verified_at_epoch" bigint,
    "verify_remarks" "text",
    "notes" "text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_sm_locations_differ" CHECK (("from_location_id" <> "to_location_id")),
    CONSTRAINT "stock_movements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'verified'::character varying])::"text"[])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tanks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tank_code" "text" NOT NULL,
    "tank_name" "text" NOT NULL,
    "tank_type" "text" NOT NULL,
    "raw_material_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tanks_tank_type_check" CHECK (("tank_type" = ANY (ARRAY['unfiltered'::"text", 'filtered'::"text"])))
);


ALTER TABLE "public"."tanks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "permission_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "module_id" "uuid",
    "can_view" boolean DEFAULT false,
    "can_write" boolean DEFAULT false,
    "can_edit" boolean DEFAULT false,
    "granted_at" timestamp without time zone DEFAULT "now"(),
    "granted_by" "uuid"
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255),
    "phone" character varying(15) NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "employee_id" character varying(50),
    "role" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "username" character varying(50) DEFAULT ''::character varying NOT NULL,
    "password_hash" character varying(255),
    "password_set_by" "uuid",
    "password_set_at" timestamp without time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."username" IS 'Login username - always phone number for now';



COMMENT ON COLUMN "public"."users"."password_hash" IS 'Bcrypt hashed password - set by admin';



COMMENT ON COLUMN "public"."users"."password_set_by" IS 'Which admin set/reset this password';



COMMENT ON COLUMN "public"."users"."password_set_at" IS 'When password was last set';



ALTER TABLE ONLY "public"."bottling_entries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bottling_entries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dispatch_items" ALTER COLUMN "item_id" SET DEFAULT "nextval"('"public"."dispatch_items_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."return_items" ALTER COLUMN "item_id" SET DEFAULT "nextval"('"public"."return_items_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stock_movement_items" ALTER COLUMN "item_id" SET DEFAULT "nextval"('"public"."stock_movement_items_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."batch_orders"
    ADD CONSTRAINT "batch_orders_batch_id_awb_number_key" UNIQUE ("batch_id", "awb_number");



ALTER TABLE ONLY "public"."batch_orders"
    ADD CONSTRAINT "batch_orders_pkey" PRIMARY KEY ("batch_order_id");



ALTER TABLE ONLY "public"."bottling_entries"
    ADD CONSTRAINT "bottling_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_sku_mapping"
    ADD CONSTRAINT "channel_sku_mapping_channel_id_channel_sku_code_key" UNIQUE ("channel_id", "channel_sku_code");



ALTER TABLE ONLY "public"."channel_sku_mapping"
    ADD CONSTRAINT "channel_sku_mapping_pkey" PRIMARY KEY ("mapping_id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_channel_code_key" UNIQUE ("channel_code");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_channel_name_key" UNIQUE ("channel_name");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("channel_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id");



ALTER TABLE ONLY "public"."dispatch_items"
    ADD CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."dispatches"
    ADD CONSTRAINT "dispatches_pkey" PRIMARY KEY ("dispatch_id");



ALTER TABLE ONLY "public"."filtering_entries"
    ADD CONSTRAINT "filtering_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "internal_skus_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "internal_skus_sku_code_key" UNIQUE ("product_code");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_batch_code_key" UNIQUE ("batch_code");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("inventory_batch_id");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("stock_id");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_product_id_location_id_condition_key" UNIQUE ("product_id", "location_id", "condition");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_location_code_key" UNIQUE ("location_code");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("location_id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_machine_code_key" UNIQUE ("machine_code");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_pkey" PRIMARY KEY ("machine_id");



ALTER TABLE ONLY "public"."manifest_batches"
    ADD CONSTRAINT "manifest_batches_batch_code_key" UNIQUE ("batch_code");



ALTER TABLE ONLY "public"."manifest_batches"
    ADD CONSTRAINT "manifest_batches_pkey" PRIMARY KEY ("batch_id");



ALTER TABLE ONLY "public"."materials_incoming"
    ADD CONSTRAINT "materials_incoming_pkey" PRIMARY KEY ("receipt_id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_material_code_key" UNIQUE ("material_code");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("material_id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_module_key_key" UNIQUE ("module_key");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_module_name_key" UNIQUE ("module_name");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("module_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_item_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."skus"
    ADD CONSTRAINT "pack_variants_pack_code_key" UNIQUE ("sku_code");



ALTER TABLE ONLY "public"."skus"
    ADD CONSTRAINT "pack_variants_pkey" PRIMARY KEY ("sku_id");



ALTER TABLE ONLY "public"."pricing_master"
    ADD CONSTRAINT "pricing_master_pkey" PRIMARY KEY ("pricing_id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_pkey" PRIMARY KEY ("batch_id");



ALTER TABLE ONLY "public"."production_costs"
    ADD CONSTRAINT "production_costs_pkey" PRIMARY KEY ("cost_id");



ALTER TABLE ONLY "public"."raw_materials"
    ADD CONSTRAINT "raw_materials_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."raw_materials"
    ADD CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("return_id");



ALTER TABLE ONLY "public"."seed_output_expectations"
    ADD CONSTRAINT "seed_output_expectations_pkey" PRIMARY KEY ("expectation_id");



ALTER TABLE ONLY "public"."seed_output_expectations"
    ADD CONSTRAINT "seed_output_expectations_seed_type_key" UNIQUE ("seed_type");



ALTER TABLE ONLY "public"."stock_movement_items"
    ADD CONSTRAINT "stock_movement_items_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("movement_id");



ALTER TABLE ONLY "public"."tanks"
    ADD CONSTRAINT "tanks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tanks"
    ADD CONSTRAINT "tanks_tank_code_key" UNIQUE ("tank_code");



ALTER TABLE ONLY "public"."tanks"
    ADD CONSTRAINT "tanks_tank_type_raw_material_id_key" UNIQUE ("tank_type", "raw_material_id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("permission_id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_module_id_key" UNIQUE ("user_id", "module_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_audit_date" ON "public"."audit_logs" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_audit_table" ON "public"."audit_logs" USING "btree" ("table_name");



CREATE INDEX "idx_audit_user" ON "public"."audit_logs" USING "btree" ("changed_by");



CREATE INDEX "idx_batch_orders_awb" ON "public"."batch_orders" USING "btree" ("awb_number");



CREATE INDEX "idx_batch_orders_batch" ON "public"."batch_orders" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_orders_order_id" ON "public"."batch_orders" USING "btree" ("order_id");



CREATE INDEX "idx_batch_orders_status" ON "public"."batch_orders" USING "btree" ("order_status");



CREATE INDEX "idx_batches_date" ON "public"."production_batches" USING "btree" ("production_date" DESC);



CREATE INDEX "idx_batches_machine" ON "public"."production_batches" USING "btree" ("machine_id");



CREATE INDEX "idx_batches_seed" ON "public"."production_batches" USING "btree" ("seed_type");



CREATE INDEX "idx_batches_status" ON "public"."production_batches" USING "btree" ("batch_status");



CREATE INDEX "idx_bottling_epoch" ON "public"."bottling_entries" USING "btree" ("bottled_at_epoch" DESC);



CREATE INDEX "idx_bottling_sku" ON "public"."bottling_entries" USING "btree" ("sku_id", "bottled_at_epoch" DESC);



CREATE INDEX "idx_channel_mapping_channel" ON "public"."channel_sku_mapping" USING "btree" ("channel_id");



CREATE INDEX "idx_channel_mapping_code" ON "public"."channel_sku_mapping" USING "btree" ("channel_sku_code");



CREATE INDEX "idx_channel_mapping_pack" ON "public"."channel_sku_mapping" USING "btree" ("sku_id");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_customers_last_order" ON "public"."customers" USING "btree" ("last_order_date" DESC);



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_customers_pincode" ON "public"."customers" USING "btree" ("pincode");



CREATE INDEX "idx_customers_tags" ON "public"."customers" USING "gin" ("tags");



CREATE INDEX "idx_customers_tier" ON "public"."customers" USING "btree" ("customer_tier");



CREATE INDEX "idx_dispatch_date" ON "public"."dispatches" USING "btree" ("dispatch_date" DESC);



CREATE INDEX "idx_dispatch_deleted" ON "public"."dispatches" USING "btree" ("is_deleted");



CREATE INDEX "idx_dispatch_epoch" ON "public"."dispatches" USING "btree" ("dispatched_at_epoch" DESC);



CREATE INDEX "idx_dispatch_from" ON "public"."dispatches" USING "btree" ("from_location_id");



CREATE INDEX "idx_dispatch_item_dispatch" ON "public"."dispatch_items" USING "btree" ("dispatch_id");



CREATE INDEX "idx_dispatch_item_sku" ON "public"."dispatch_items" USING "btree" ("sku_id");



CREATE INDEX "idx_filtering_date" ON "public"."filtering_entries" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_filtering_location" ON "public"."filtering_entries" USING "btree" ("location_id");



CREATE INDEX "idx_filtering_material" ON "public"."filtering_entries" USING "btree" ("raw_material_id");



CREATE INDEX "idx_inv_batches_location" ON "public"."inventory_batches" USING "btree" ("location_id");



CREATE INDEX "idx_inv_batches_material" ON "public"."inventory_batches" USING "btree" ("product_id");



CREATE INDEX "idx_inv_batches_purchase_date" ON "public"."inventory_batches" USING "btree" ("purchase_date");



CREATE INDEX "idx_inv_batches_status" ON "public"."inventory_batches" USING "btree" ("status");



CREATE INDEX "idx_invoices_customer" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "idx_invoices_date" ON "public"."invoices" USING "btree" ("invoice_date" DESC);



CREATE INDEX "idx_invoices_fy" ON "public"."invoices" USING "btree" ("financial_year");



CREATE INDEX "idx_invoices_number" ON "public"."invoices" USING "btree" ("invoice_number");



CREATE INDEX "idx_invoices_order" ON "public"."invoices" USING "btree" ("order_id");



CREATE INDEX "idx_locations_code" ON "public"."locations" USING "btree" ("location_code");



CREATE INDEX "idx_locations_type" ON "public"."locations" USING "btree" ("location_type");



CREATE INDEX "idx_machines_active" ON "public"."machines" USING "btree" ("status", "is_deleted");



CREATE INDEX "idx_machines_code" ON "public"."machines" USING "btree" ("machine_code");



CREATE INDEX "idx_machines_location" ON "public"."machines" USING "btree" ("location_id");



CREATE INDEX "idx_manifest_batches_channel" ON "public"."manifest_batches" USING "btree" ("channel_id");



CREATE INDEX "idx_manifest_batches_code" ON "public"."manifest_batches" USING "btree" ("batch_code");



CREATE INDEX "idx_manifest_batches_date" ON "public"."manifest_batches" USING "btree" ("expected_pickup_date" DESC);



CREATE INDEX "idx_manifest_batches_status" ON "public"."manifest_batches" USING "btree" ("batch_status");



CREATE INDEX "idx_materials_category" ON "public"."materials" USING "btree" ("material_category");



CREATE INDEX "idx_materials_code" ON "public"."materials" USING "btree" ("material_code");



CREATE INDEX "idx_materials_incoming_date" ON "public"."materials_incoming" USING "btree" ("received_date" DESC);



CREATE INDEX "idx_materials_incoming_location" ON "public"."materials_incoming" USING "btree" ("location_id");



CREATE INDEX "idx_materials_incoming_material" ON "public"."materials_incoming" USING "btree" ("material_id");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_awb" ON "public"."orders" USING "btree" ("awb_number");



CREATE INDEX "idx_orders_channel" ON "public"."orders" USING "btree" ("channel_id");



CREATE INDEX "idx_orders_channel_order_id" ON "public"."orders" USING "btree" ("channel_order_id");



CREATE INDEX "idx_orders_customer" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_date" ON "public"."orders" USING "btree" ("order_date" DESC);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("order_status");



CREATE INDEX "idx_pricing_channel" ON "public"."pricing_master" USING "btree" ("channel_id");



CREATE INDEX "idx_pricing_effective" ON "public"."pricing_master" USING "btree" ("effective_from", "effective_to");



CREATE INDEX "idx_pricing_product" ON "public"."pricing_master" USING "btree" ("product_id");



CREATE INDEX "idx_production_costs_batch" ON "public"."production_costs" USING "btree" ("batch_id");



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("is_active", "is_deleted");



CREATE INDEX "idx_products_code" ON "public"."products" USING "btree" ("product_code");



CREATE INDEX "idx_products_type" ON "public"."products" USING "btree" ("product_type");



CREATE INDEX "idx_return_item_action" ON "public"."return_items" USING "btree" ("action_taken");



CREATE INDEX "idx_return_item_condition" ON "public"."return_items" USING "btree" ("physical_condition");



CREATE INDEX "idx_return_item_return" ON "public"."return_items" USING "btree" ("return_id");



CREATE INDEX "idx_return_item_sku" ON "public"."return_items" USING "btree" ("sku_id");



CREATE INDEX "idx_returns_awb" ON "public"."returns" USING "btree" ("awb_number");



CREATE INDEX "idx_returns_date" ON "public"."returns" USING "btree" ("return_date" DESC);



CREATE INDEX "idx_returns_epoch" ON "public"."returns" USING "btree" ("received_at_epoch" DESC);



CREATE INDEX "idx_returns_escalation" ON "public"."returns" USING "btree" ("escalation_required", "escalation_status");



CREATE INDEX "idx_returns_location" ON "public"."returns" USING "btree" ("received_location_id");



CREATE INDEX "idx_returns_order" ON "public"."returns" USING "btree" ("order_id");



CREATE INDEX "idx_skus_active" ON "public"."skus" USING "btree" ("is_active");



CREATE INDEX "idx_skus_barcode" ON "public"."skus" USING "btree" ("barcode");



CREATE INDEX "idx_skus_code" ON "public"."skus" USING "btree" ("sku_code");



CREATE INDEX "idx_skus_product" ON "public"."skus" USING "btree" ("product_id");



CREATE INDEX "idx_sm_from" ON "public"."stock_movements" USING "btree" ("from_location_id");



CREATE INDEX "idx_sm_sent_epoch" ON "public"."stock_movements" USING "btree" ("sent_at_epoch" DESC);



CREATE INDEX "idx_sm_status" ON "public"."stock_movements" USING "btree" ("status", "is_deleted");



CREATE INDEX "idx_sm_to" ON "public"."stock_movements" USING "btree" ("to_location_id");



CREATE INDEX "idx_smi_movement" ON "public"."stock_movement_items" USING "btree" ("movement_id");



CREATE INDEX "idx_smi_sku" ON "public"."stock_movement_items" USING "btree" ("sku_id");



CREATE INDEX "idx_stock_condition" ON "public"."inventory_stock" USING "btree" ("condition");



CREATE INDEX "idx_stock_location" ON "public"."inventory_stock" USING "btree" ("location_id");



CREATE INDEX "idx_stock_product" ON "public"."inventory_stock" USING "btree" ("product_id");



CREATE INDEX "idx_user_permissions_module" ON "public"."user_permissions" USING "btree" ("module_id");



CREATE INDEX "idx_user_permissions_user" ON "public"."user_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone");



CREATE UNIQUE INDEX "idx_users_phone_unique" ON "public"."users" USING "btree" ("phone");



CREATE UNIQUE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."batch_orders"
    ADD CONSTRAINT "batch_orders_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."manifest_batches"("batch_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_orders"
    ADD CONSTRAINT "batch_orders_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."bottling_entries"
    ADD CONSTRAINT "bottling_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."bottling_entries"
    ADD CONSTRAINT "bottling_entries_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("sku_id");



ALTER TABLE ONLY "public"."channel_sku_mapping"
    ADD CONSTRAINT "channel_sku_mapping_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id");



ALTER TABLE ONLY "public"."channel_sku_mapping"
    ADD CONSTRAINT "channel_sku_mapping_pack_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("sku_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_merged_into_fkey" FOREIGN KEY ("merged_into") REFERENCES "public"."customers"("customer_id");



ALTER TABLE ONLY "public"."dispatch_items"
    ADD CONSTRAINT "dispatch_items_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatches"("dispatch_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispatch_items"
    ADD CONSTRAINT "dispatch_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("sku_id");



ALTER TABLE ONLY "public"."dispatches"
    ADD CONSTRAINT "dispatches_dispatched_by_fkey" FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."dispatches"
    ADD CONSTRAINT "dispatches_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."filtering_entries"
    ADD CONSTRAINT "filtering_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."filtering_entries"
    ADD CONSTRAINT "filtering_entries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."filtering_entries"
    ADD CONSTRAINT "filtering_entries_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("machine_id");



ALTER TABLE ONLY "public"."filtering_entries"
    ADD CONSTRAINT "filtering_entries_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "fk_locations_manager" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_material_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."manifest_batches"
    ADD CONSTRAINT "manifest_batches_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id");



ALTER TABLE ONLY "public"."manifest_batches"
    ADD CONSTRAINT "manifest_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."materials_incoming"
    ADD CONSTRAINT "materials_incoming_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."materials_incoming"
    ADD CONSTRAINT "materials_incoming_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("material_id");



ALTER TABLE ONLY "public"."materials_incoming"
    ADD CONSTRAINT "materials_incoming_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pack_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("sku_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_dispatch_batch_id_fkey" FOREIGN KEY ("dispatch_batch_id") REFERENCES "public"."manifest_batches"("batch_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."skus"
    ADD CONSTRAINT "pack_variants_internal_sku_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."pricing_master"
    ADD CONSTRAINT "pricing_master_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id");



ALTER TABLE ONLY "public"."pricing_master"
    ADD CONSTRAINT "pricing_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."pricing_master"
    ADD CONSTRAINT "pricing_master_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("machine_id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."production_costs"
    ADD CONSTRAINT "production_costs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("batch_id");



ALTER TABLE ONLY "public"."production_costs"
    ADD CONSTRAINT "production_costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("return_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("sku_id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_received_location_id_fkey" FOREIGN KEY ("received_location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."stock_movement_items"
    ADD CONSTRAINT "stock_movement_items_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "public"."stock_movements"("movement_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movement_items"
    ADD CONSTRAINT "stock_movement_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("sku_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."tanks"
    ADD CONSTRAINT "tanks_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."tanks"
    ADD CONSTRAINT "tanks_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("module_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_password_set_by_fkey" FOREIGN KEY ("password_set_by") REFERENCES "public"."users"("user_id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_password"("p_password" "text", "p_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_password"("p_password" "text", "p_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_password"("p_password" "text", "p_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."batch_orders" TO "anon";
GRANT ALL ON TABLE "public"."batch_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_orders" TO "service_role";



GRANT ALL ON TABLE "public"."bottling_entries" TO "anon";
GRANT ALL ON TABLE "public"."bottling_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."bottling_entries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bottling_entries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bottling_entries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bottling_entries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."channel_sku_mapping" TO "anon";
GRANT ALL ON TABLE "public"."channel_sku_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_sku_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."dispatch_items" TO "anon";
GRANT ALL ON TABLE "public"."dispatch_items" TO "authenticated";
GRANT ALL ON TABLE "public"."dispatch_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dispatch_items_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dispatch_items_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dispatch_items_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dispatches" TO "anon";
GRANT ALL ON TABLE "public"."dispatches" TO "authenticated";
GRANT ALL ON TABLE "public"."dispatches" TO "service_role";



GRANT ALL ON TABLE "public"."filtering_entries" TO "anon";
GRANT ALL ON TABLE "public"."filtering_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."filtering_entries" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_batches" TO "anon";
GRANT ALL ON TABLE "public"."inventory_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_batches" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."machines" TO "anon";
GRANT ALL ON TABLE "public"."machines" TO "authenticated";
GRANT ALL ON TABLE "public"."machines" TO "service_role";



GRANT ALL ON TABLE "public"."manifest_batches" TO "anon";
GRANT ALL ON TABLE "public"."manifest_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."manifest_batches" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."materials_incoming" TO "anon";
GRANT ALL ON TABLE "public"."materials_incoming" TO "authenticated";
GRANT ALL ON TABLE "public"."materials_incoming" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_master" TO "anon";
GRANT ALL ON TABLE "public"."pricing_master" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_master" TO "service_role";



GRANT ALL ON TABLE "public"."production_batches" TO "anon";
GRANT ALL ON TABLE "public"."production_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."production_batches" TO "service_role";



GRANT ALL ON TABLE "public"."production_costs" TO "anon";
GRANT ALL ON TABLE "public"."production_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."production_costs" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."raw_materials" TO "anon";
GRANT ALL ON TABLE "public"."raw_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_materials" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."return_items_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."return_items_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."return_items_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON TABLE "public"."seed_output_expectations" TO "anon";
GRANT ALL ON TABLE "public"."seed_output_expectations" TO "authenticated";
GRANT ALL ON TABLE "public"."seed_output_expectations" TO "service_role";



GRANT ALL ON TABLE "public"."skus" TO "anon";
GRANT ALL ON TABLE "public"."skus" TO "authenticated";
GRANT ALL ON TABLE "public"."skus" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movement_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_movement_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movement_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_movement_items_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_movement_items_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_movement_items_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."tanks" TO "anon";
GRANT ALL ON TABLE "public"."tanks" TO "authenticated";
GRANT ALL ON TABLE "public"."tanks" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."stock_movement_items" drop constraint "stock_movement_items_reason_check";

alter table "public"."stock_movements" drop constraint "stock_movements_status_check";

alter table "public"."stock_movement_items" add constraint "stock_movement_items_reason_check" CHECK (((reason)::text = ANY ((ARRAY['Fresh Stock'::character varying, 'Expired'::character varying, 'Leakage'::character varying, 'Bad Packing'::character varying, 'Missing Label'::character varying, 'Reprocess'::character varying])::text[]))) not valid;

alter table "public"."stock_movement_items" validate constraint "stock_movement_items_reason_check";

alter table "public"."stock_movements" add constraint "stock_movements_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying])::text[]))) not valid;

alter table "public"."stock_movements" validate constraint "stock_movements_status_check";

-- CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

-- CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

-- CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

-- CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

-- CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


