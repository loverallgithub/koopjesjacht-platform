/**
 * Passport Configuration
 * JWT authentication strategy
 */

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret_here'
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(options, async (jwt_payload, done) => {
      try {
        const result = await pool.query(
          'SELECT id, email, username, role FROM users WHERE id = $1 AND deleted_at IS NULL',
          [jwt_payload.id]
        );

        if (result.rows.length > 0) {
          return done(null, result.rows[0]);
        }

        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query(
        'SELECT id, email, username, role FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length > 0) {
        done(null, result.rows[0]);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error, false);
    }
  });
};
