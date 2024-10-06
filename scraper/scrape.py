import logging
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from webdriver_manager.firefox import GeckoDriverManager
from selenium.common.exceptions import TimeoutException, WebDriverException, NoSuchElementException, StaleElementReferenceException
from message import send_to_discord
import time

# Add this near the top of your file, after the imports
logging.getLogger('selenium').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

class FirefoxDriverManager:
    _instance = None
    _scrap_url = 'https://www.saltybet.com/'

    @classmethod
    def get_instance(cls):
        if cls._instance is None or not cls._is_driver_valid():
            cls._initialize_driver()
        return cls._instance
        
    @classmethod
    def _initialize_driver(cls):
        firefox_options = Options()
        firefox_options.add_argument("--headless")
        firefox_options.add_argument("--no-sandbox")
        firefox_options.add_argument("--disable-dev-shm-usage")
        firefox_options.add_argument("--disable-gpu")
        firefox_options.add_argument("--disable-extensions")
        firefox_options.add_argument("--disable-application-cache")
        firefox_options.add_argument("--disable-infobars")

        # Memory optimization settings
        firefox_options.set_preference("browser.privatebrowsing.autostart", True)
        firefox_options.set_preference("permissions.default.image", 2)
        firefox_options.set_preference("javascript.enabled", True)
        firefox_options.set_preference("dom.ipc.plugins.enabled", False)
        firefox_options.set_preference("media.autoplay.default", 5)
        firefox_options.set_preference("media.hardware-video-decoding.enabled", False)
        firefox_options.set_preference("browser.cache.disk.enable", False)
        firefox_options.set_preference("browser.cache.memory.enable", True)
        firefox_options.set_preference("browser.cache.memory.capacity", 32768)
        firefox_options.set_preference("browser.cache.offline.enable", False)
        firefox_options.set_preference("browser.sessionstore.max_tabs_undo", 0)
        firefox_options.set_preference("browser.sessionhistory.max_entries", 1)
        firefox_options.set_preference("browser.sessionhistory.max_total_viewers", 0)
        firefox_options.set_preference("network.prefetch-next", False)
        firefox_options.set_preference("network.dns.disablePrefetch", True)
        firefox_options.set_preference("network.http.speculative-parallel-limit", 0)
        firefox_options.set_preference("browser.urlbar.suggest.searches", False)
        firefox_options.set_preference("browser.newtabpage.enabled", False)
        firefox_options.set_preference("browser.newtab.preload", False)

        # Content process limit
        firefox_options.set_preference("dom.ipc.processCount", 1)

        # Lower the maximum amount of decoded image data that can be stored
        firefox_options.set_preference("image.mem.max_decoded_image_kb", 51200)

        # Disable accessibility services
        firefox_options.set_preference("accessibility.force_disabled", 1)

        # Security settings
        firefox_options.set_preference("security.sandbox.content.level", 4)
        firefox_options.set_preference("privacy.trackingprotection.enabled", True)
        firefox_options.set_preference("network.cookie.cookieBehavior", 1)

        # Disable autoplay for media
        firefox_options.set_preference("media.autoplay.default", 5)
        firefox_options.set_preference("media.autoplay.blocking_policy", 2)

        # Disable video and audio
        firefox_options.set_preference("media.navigator.video.enabled", False)
        firefox_options.set_preference("media.navigator.audio.enabled", False)

        # Enhanced security settings
        firefox_options.set_preference("security.sandbox.content.level", 6)
        firefox_options.set_preference("privacy.trackingprotection.enabled", True)
        firefox_options.set_preference("privacy.trackingprotection.fingerprinting.enabled", True)
        firefox_options.set_preference("privacy.trackingprotection.cryptomining.enabled", True)
        firefox_options.set_preference("privacy.resistFingerprinting", True)
        firefox_options.set_preference("network.cookie.cookieBehavior", 1)
        firefox_options.set_preference("network.http.referer.XOriginPolicy", 2)
        firefox_options.set_preference("network.http.referer.trimmingPolicy", 2)
        firefox_options.set_preference("dom.security.https_only_mode", True)
        firefox_options.set_preference("javascript.options.asmjs", False)
        firefox_options.set_preference("javascript.options.wasm", False)
        firefox_options.set_preference("dom.workers.enabled", False)
        firefox_options.set_preference("dom.serviceWorkers.enabled", False)
        firefox_options.set_preference("webgl.disabled", True)
        firefox_options.set_preference("media.peerconnection.enabled", False)
        firefox_options.set_preference("geo.enabled", False)
        firefox_options.set_preference("extensions.blocklist.enabled", True)
        firefox_options.set_preference("network.IDN_show_punycode", True)
        firefox_options.set_preference("general.useragent.override", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0")
        firefox_options.set_preference("security.csp.enable", True)

        firefox_options.set_preference("dom.battery.enabled", False)
        firefox_options.set_preference("dom.gamepad.enabled", False)
        firefox_options.set_preference("dom.vibrator.enabled", False)
        firefox_options.set_preference("dom.vr.enabled", False)

        firefox_options.set_preference("network.http.phishy-userpass-length", 255)
        block_list = [
            "*://*.twitch.tv/*",
            "*://*.ttvnw.net/*",
            "*://*.jtvnw.net/*",
            "*://player.twitch.tv/*",
        ]
        firefox_options.set_preference("permissions.default.image", 2)
        for domain in block_list:
            firefox_options.set_preference(f"network.http.blocked-content-sources", domain)

        firefox_options.set_preference("media.peerconnection.enabled", False)
    
        # Add this line just before creating the Firefox driver
        logging.getLogger('selenium.webdriver.remote.remote_connection').setLevel(logging.WARNING)

        service = Service('/usr/local/bin/geckodriver')
        cls._instance = webdriver.Firefox(service=service, options=firefox_options)
        cls._instance.set_page_load_timeout(30)
        cls._instance.get(cls._scrap_url)
        time.sleep(5)

    @classmethod
    def _is_driver_valid(cls):
        try:
            cls._instance.title
            return True
        except (WebDriverException, AttributeError) as e:
            send_to_discord(f"scrape: Webdriver issue: {e}")
            return False
        except Exception as e:
            send_to_discord(f"scrape: Unexpected error: {e}")
            return False

def wait_next_phase(driver, xpath, previous_phase):
    timeout = 600
    phase = {"text": None}
    max_retries = 3
    retry_delay = 1

    def check_change(driver):
        for attempt in range(max_retries):
            try:
                element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, xpath))
                )
                if element.text and element.text != previous_phase:
                    phase["text"] = element.text
                    print(f"Phase: {phase['text']}")
                    return True
            except StaleElementReferenceException:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                else:
                    raise
            except (TimeoutException, NoSuchElementException):
                return False
        return False

    try:
        WebDriverWait(driver, timeout).until(check_change)
        return phase["text"]
    except TimeoutException:
        send_to_discord(f"scrape: Phase timeout")
        return previous_phase
    except Exception as e:
        send_to_discord(f"scrape: Unexpected error: {e}")
        return previous_phase
    
def scrape_fighter(driver):
    try:
        blue_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '/html/body/div/div[1]/div[2]/span/strong'))
        )
        blue_name = blue_element.text
        fighter_blue = {"name": blue_name}

        red_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '/html/body/div/div[1]/div[1]/span/strong'))
        )
        red_name = red_element.text
        fighter_red = {"name": red_name}

        return fighter_red, fighter_blue
    except TimeoutException:
        send_to_discord("scrape: Timeout while scraping fighter names")
        return None, None
    except Exception as e:
        send_to_discord(f"scrape: Error while scraping fighter names: {e}")
        return None, None