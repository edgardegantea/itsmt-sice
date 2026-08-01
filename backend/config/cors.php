<?php

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
    ],

    // Vite auto-increments the port (5174, 5175…) whenever 5173 is already taken by
    // another instance — without this pattern, that alone breaks login with a CORS error
    // even though it's still the same local frontend.
    'allowed_origins_patterns' => [
        '#^http://localhost:\d+$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,
];
