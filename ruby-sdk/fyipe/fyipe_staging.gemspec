require File.expand_path('lib/fyipe/version', __dir__)

Gem::Specification.new do |spec|

    spec.name                  = 'fyipe_staging'
    spec.version               = Fyipe::VERSION
    spec.authors               = ['HackerBay, Inc.']
    spec.email                 = ['hello@hackerbay.io']
    spec.summary               = 'Fyipe for Logging and Tracking'
    spec.description           = 'Fyipe is a ruby package that tracks error event and send logs from your applications to your fyipe dashboard.'
    spec.homepage              = 'https://github.com/Fyipe/ruby-sdk'
    spec.license               = 'MIT'
    spec.platform              = Gem::Platform::RUBY
    spec.required_ruby_version = '>= 2.5.0'
    spec.files = Dir['README.md', 'LICENSE',
                 'CHANGELOG.md', 'ruby-sdk/**/*.rb',
                 'ruby-sdk/**/*.rake',
                 'fyipe_staging.gemspec', '.github/*.md',
                 'Gemfile', 'Rakefile']
    spec.extra_rdoc_files = ['README.md']
    spec.add_dependency 'httparty', '~> 0.17'
    spec.add_dependency 'gem-release'
    spec.add_development_dependency 'dotenv', '~> 2.5'
    spec.add_development_dependency 'rspec', '~> 3.6'
    spec.add_development_dependency 'rubocop', '~> 0.60'
    spec.add_development_dependency 'rubocop-performance', '~> 1.5'
    spec.add_development_dependency 'rubocop-rspec', '~> 1.37'
    spec.add_development_dependency 'faker', '~> 2.18'
    
end