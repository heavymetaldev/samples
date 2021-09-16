locals {
    prefix = "hmdev-sample"
    location = "westeurope"
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=2.46.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
    name     = "${local.prefix}-rg"
    location = local.location
}

resource "azurerm_application_insights" "ai" {
  name                = "${local.prefix}-appinsights"
  location            = local.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
}

resource "azurerm_app_service_plan" "webapp_plan" {
  name                = "${local.prefix}-free-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "Windows"

  sku {
    tier = "Free"
    size = "F1"
  }
}

resource "azurerm_app_service" "webapp" {
  name                      = "${local.prefix}-webapp"  # this has to be globally unique
  location                  = azurerm_resource_group.rg.location
  resource_group_name       = azurerm_resource_group.rg.name
  app_service_plan_id       = azurerm_app_service_plan.webapp_plan.id
  
  site_config {    
    use_32_bit_worker_process = true # have to use 32bit worker if using Free tier
  }

  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~16"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.ai.instrumentation_key
  }
}