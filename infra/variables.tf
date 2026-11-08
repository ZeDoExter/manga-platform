variable "prefix" {
  description = "Resource name prefix (lowercase alphanumeric)."
  type        = string
  default     = "manga"
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "southeastasia"
}

variable "zone_count" {
  description = "1 = demo (single zone), 2 = production posture."
  type        = number
  default     = 1
}

variable "node_vm_size" {
  description = "AKS node size."
  type        = string
  default     = "Standard_B2s"
}

variable "node_count" {
  description = "AKS system pool node count."
  type        = number
  default     = 2
}

variable "pg_sku" {
  description = "PostgreSQL Flexible Server SKU."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "pg_storage_mb" {
  description = "PostgreSQL storage in MB."
  type        = number
  default     = 32768
}

variable "daily_budget_usd" {
  description = "Daily budget cap in USD (alert only; Azure cannot hard-block spend)."
  type        = number
  default     = 1
}

variable "alert_email" {
  description = "Email for budget alerts. Empty disables email delivery."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default = {
    project     = "manga-platform"
    environment = "demo"
    managed_by  = "terraform"
  }
}
