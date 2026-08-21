terraform {
  backend "s3" {
    bucket                      = "zunoser-tofu-state"
    key                         = "github/repositories/calendar/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
    use_lockfile                = true
  }
}
