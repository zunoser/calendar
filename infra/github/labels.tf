locals {
  repository_labels = {
    "Birthday🎂" = {
      color       = "eff587"
      description = ""
    }
    "Gambling💰" = {
      color       = "ed9324"
      description = ""
    }
    "Geek💻" = {
      color       = "6c30bc"
      description = ""
    }
    "Nerd🤓" = {
      color       = "f74761"
      description = ""
    }
  }
}

resource "github_issue_label" "this" {
  for_each = local.repository_labels

  repository  = module.repository.name
  name        = each.key
  color       = each.value.color
  description = each.value.description
}
