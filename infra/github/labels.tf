locals {
  repository_labels = {
    "Birthday🎂" = {
      color       = "eff587"
      description = "誕生日に関する予定"
    }
    "Gambling💰" = {
      color       = "ed9324"
      description = "ギャンブルに関する予定"
    }
    "Geek💻" = {
      color       = "6c30bc"
      description = "技術やコンピューターに関する予定"
    }
    "Nerd🤓" = {
      color       = "f74761"
      description = "趣味やオタク活動に関する予定"
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
