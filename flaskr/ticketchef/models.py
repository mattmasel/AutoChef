from dataclasses import dataclass

@dataclass
class Solution:
    issue_tag: str
    category: str
    subcategory: str
    issue: str
    solution_steps: str
    keywords: str
    notes: str
