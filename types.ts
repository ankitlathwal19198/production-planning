export type PlanningData = {
  uid: string;
  timestamp: string;

  sales_order: string;
  buyer: string;
  lot_number: string;
  quality: string;

  wh_name_lot_location: string;
  number_of_planned_bags: number;

  plant_name: string;
  planning_submitted_by: string;

  per_bag_wt: number;

  stock_used_from_outside_wh_closed: string;

  approval_date_time: string;
  dummy_column?: string;

  approval_status: string;
  approved_by: string;

  total_hodi_cut: number;
  pending_hodi_bags: number;

  hodi_cut_url?: string;

  old_status?: string;
  open_link_for_hodi?: string;

  old_entry_status?: string;
  open_link_for_planning_approval_closed?: string;

  planned_qty_in_mts: number;

  sale_order_cancellation_status?: string;

  recent_fumigation_date_started_from_25_07_2024?: string;
  fumigation_status?: string;

  planning_no_lot_so: string;

  found_null?: string;
  hodii_cut_not?: string;

  uid_match?: string;
  error_not?: string;
};


// ================== PLANNING DATA TYPES ================== //

// types/planning.ts
export type SalesOrder = {
  sales_order: string;
  so_date: string;
  buyer: string;
  item_number: string;
  brand_name_quality_description: string;
  packing_size: string;
  number_of_bags: string;
  plant: string;
};

export type PlanningLine = {
  sales_order: string;
  buyer: string;
  lot: string;
  quality: string;
  warehouse: string;
  bags_for_planning: number;
  total_bags: number;
};

export type OutstandingData = {
  lot_no: number;
  truck_number: string;
  quality: string;
  per_bag_weight_in_kg: number;
  supplier_name: string;
  warehouse_location: string;
  planning_stock_approved: number;
  planning_stock_unapproved: number;
  outstanding_stock: number;
};

export type Users = {
  id: string;
  email: string;
  hash: string;
  name: string;
  role: string;
  created_at: string;
  allowed_users: string[];
  plant_name: string;
}