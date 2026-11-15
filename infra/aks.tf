# AKS: single system pool (B2s x N), Azure CNI overlay, Key Vault CSI.
# No NAT Gateway / Bastion / Front Door (demo cost posture).

resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.name}-demo-aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  dns_prefix          = "${local.name}-demo"
  sku_tier            = "Free"
  tags                = var.tags

  default_node_pool {
    name                 = "system"
    node_count           = var.node_count
    vm_size              = var.node_vm_size
    vnet_subnet_id       = azurerm_subnet.aks.id
    zones                = slice(["3", "2"], 0, var.zone_count)
    auto_scaling_enabled = true
    min_count            = 2
    max_count            = 3
  }

  role_based_access_control_enabled = true

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    service_cidr        = "10.43.0.0/16"
    dns_service_ip      = "10.43.0.10"
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = false
  }

  # OIDC + workload identity off for demo (services use env secrets).
}

# AKS -> ACR pull
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# AKS Key Vault Secrets Provider -> read DATABASE_URL
resource "azurerm_role_assignment" "aks_kv_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_kubernetes_cluster.main.key_vault_secrets_provider[0].secret_identity[0].object_id
}
