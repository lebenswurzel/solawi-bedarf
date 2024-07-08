import sys
import os


banner = f'''This file is part of {os.environ.get('APP_NAME', 'SOLAWI APP')}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.'''


def remove_banner(content, comment_open, comment_close) -> tuple[str, str]:
  lines = []
  banner_lines = []
  opening_comment_found = False
  closing_comment_found = False
  for line in content.split('\n'):
    if line == comment_open:
      opening_comment_found = True
    if not closing_comment_found and opening_comment_found:
      if line == comment_close:
        closing_comment_found = True
      else:
        banner_lines.append(line)
      continue
    lines.append(line)
  return '\n'.join(lines), '\n'.join(banner_lines[1:])


def add_banner(content, comment_open, comment_close):
  return f'''{comment_open}
{banner}
{comment_close}
{content}'''


def modify_file(path: str, check_only=False) -> bool:
  with open(path) as f:
    content = f.read()

  if path.endswith('.vue'):
    comment_open = '<!--'
    comment_close = '-->'
  else:
    comment_open = '/*'
    comment_close = '*/'

  current_banner = ''
  if content[:len(comment_open)] == comment_open:
    content, current_banner = remove_banner(content, comment_open, comment_close)

  if banner != current_banner:
    if check_only:
      print(f'{path} has an inconsistent header')
    else:
      content_with_banner = add_banner(content, comment_open, comment_close)
      with open(path, 'w') as f:
        f.write(content_with_banner)
      print(f'changed {path}')
    return True
  return False


if __name__ == '__main__':
  check_only = '--check' in sys.argv
  result = modify_file(sys.argv[1], check_only)
  if check_only:
    exit(1 if result else 0)
