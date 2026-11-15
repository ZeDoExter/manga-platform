# PostgreSQL Flexible Server (Burstable B1ms, single zone, private VNet).
# One server, one database; services share it via separate schemas
# (catalog/commerce/library), matching local docker-compose.

# NOTE (2026-11-15): live admin password was rotated out-of-band after a state
# leak; run the next apply with -replace=random_password.pg_admin so TF does
# not revert it to the leaked value still stored in old state revisions.
resource "random_password" "pg_admin" {
  length  = 24
  special = false
}

resource "azurerm_private_dns_zone" "pg" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "pg" {
  name                  = "${local.name}-pg-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.pg.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.name}-demo-pg"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "16"
  administrator_login    = "manga"
  administrator_password = random_password.pg_admin.result
  sku_name               = var.pg_sku
  storage_mb             = var.pg_storage_mb
  zone                   = "1"

  delegated_subnet_id           = azurerm_subnet.db.id
  private_dns_zone_id           = azurerm_private_dns_zone.pg.id
  public_network_access_enabled = false

  authentication {
    password_auth_enabled = true
  }

  tags = var.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.pg]
}

resource "azurerm_postgresql_flexible_server_database" "manga" {
  name      = "manga"
  server_id = azurerm_postgresql_flexible_server.main.id
}

# DATABASE_URL in Key Vault; AKS pulls it via CSI driver (see k8s overlay).
resource "azurerm_key_vault_secret" "database_url" {
  name            = "database-url"
  value           = "postgres://manga:${urlencode(random_password.pg_admin.result)}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/manga?sslmode=require"
  key_vault_id    = azurerm_key_vault.main.id
  content_type    = "database-url"
  expiration_date = "2028-11-15T00:00:00Z"

  depends_on = [azurerm_role_assignment.deployer_kv_admin]
}

# Audit logging params mirror the live server (all ON, reload-level, no restart).
resource "azurerm_postgresql_flexible_server_configuration" "log_connections" {
  name      = "log_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_checkpoints" {
  name      = "log_checkpoints"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}
