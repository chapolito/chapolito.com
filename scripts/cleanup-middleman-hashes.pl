#!/usr/bin/perl
use strict;
use warnings;
use File::Find;
use File::Basename qw(dirname basename fileparse);
use File::Copy qw(move);
use Cwd qw(abs_path);

my $ROOT = abs_path(dirname(dirname(__FILE__)));
chdir $ROOT or die "chdir $ROOT: $!";

# Unused Middleman build artifacts (not referenced in any HTML)
my @DELETE = qw(
  stylesheets/all-06568b07.css
  stylesheets/all-954bce86.css
  javascripts/all-8f2409a4.js
  javascripts/animate-header-3a9dae44.js
  javascripts/animate-into-view-8ffd8f34.js
  javascripts/animate-transitions-bd99bd24.js
  javascripts/vendor/jquery.smoothState-21ec5d3d.js
  javascripts/vendor/jquery.smoothState-8c83fa70.js
  javascripts/vendor/fastclick.min-20cb5dda.js
);

for my $rel (@DELETE) {
  my $path = "$ROOT/$rel";
  if (-f $path) {
    unlink $path or warn "unlink $rel: $!\n";
    print "deleted $rel\n";
  }
}

my $HASH_SUFFIX = qr/-([0-9a-f]{8})(?=\.[^.\/]+$)/;

sub clean_basename {
  my ($name) = @_;
  $name =~ s/$HASH_SUFFIX//;
  return $name;
}

# Rename hashed files on disk (deepest paths first to avoid dir issues)
my @hashed_files;
find(
  sub {
    return if -d $_;
    my $base = $_;
    return unless $base =~ $HASH_SUFFIX;
    push @hashed_files, $File::Find::name;
  },
  $ROOT
);

@hashed_files = sort { length($b) <=> length($a) } @hashed_files;

my %rename_map;    # old relative path -> new relative path
for my $abs (@hashed_files) {
  next if $abs =~ m{/scripts/};
  my $rel = $abs;
  $rel =~ s/^\Q$ROOT\E\/?//;
  my $dir  = dirname($rel);
  my $base = basename($rel);
  my $new_base = clean_basename($base);
  next if $new_base eq $base;
  my $new_rel = ($dir eq '.' ? $new_base : "$dir/$new_base");
  my $new_abs = "$ROOT/$new_rel";

  if (-e $new_abs && abs_path($new_abs) ne abs_path($abs)) {
    warn "skip rename (target exists): $rel -> $new_rel\n";
    next;
  }

  move($abs, $new_abs) or die "move $rel -> $new_rel: $!";
  $rename_map{$rel} = $new_rel;
  print "renamed $rel -> $new_rel\n";
}

# Update references in text assets
my @text_files;
find(
  sub {
    return if -d $_;
    return unless /\.(html|css|js)\z/i;
    return if $File::Find::name =~ m{/scripts/};
    push @text_files, $File::Find::name;
  },
  $ROOT
);

for my $abs (@text_files) {
  open my $fh, '<', $abs or die $!;
  local $/;
  my $content = <$fh>;
  close $fh;
  my $orig = $content;

  # Apply explicit renames longest-first (path segments)
  for my $old (sort { length($b) <=> length($a) } keys %rename_map) {
    my $new = $rename_map{$old};
    $content =~ s/\Q$old\E/$new/g;
  }

  # Strip any remaining Middleman hash suffixes in paths
  $content =~ s/-[0-9a-f]{8}(?=\.[^.\s"')\?]+)//g;

  # Remove Middleman ERB comment remnants in HTML
  $content =~ s/^\s*<!--\s*\/=\s*stylesheet_link_tag[^>]*-->\s*\n?//gm;

  if ($content ne $orig) {
    open my $out, '>', $abs or die $!;
    print $out $content;
    close $out;
    my $rel = $abs;
    $rel =~ s/^\Q$ROOT\E\/?//;
    print "updated $rel\n";
  }
}

print "done.\n";
